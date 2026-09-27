// Auth E2E — membership lifecycle: suspend / reactivate / purge and the
// "can a removed user still use the site?" question.
//
// The app has no "revoke" for active members: admins suspend, owners purge.
// RLS gates every business table on the live `is_active_member()` check, so a
// suspended member's existing JWT loses database access immediately even though
// the token itself is still cryptographically valid.

import { expect, test } from '@playwright/test'
import {
  accessTokenFor,
  assertStaging,
  callRpc,
  cleanupTrackedUsers,
  cleanupUsersByEmailPrefix,
  createActiveUser,
  getAuthUserByEmail,
  getEmployeeById,
  hasServiceRole,
  restRequest,
} from './fixtures/admin'
import { EMAIL_PREFIX, OWNER_EMAIL, OWNER_PASSWORD, testEmail } from './fixtures/identities'
import { login } from './helpers'

const MISSING_KEY = 'SUPABASE_SERVICE_ROLE_KEY not set — auth E2E requires the staging service role'

test.describe('membership lifecycle', () => {
  test.skip(!hasServiceRole, MISSING_KEY)

  let ownerToken = ''

  test.beforeAll(async () => {
    if (!hasServiceRole) return
    assertStaging()
    ownerToken = await accessTokenFor(OWNER_EMAIL, OWNER_PASSWORD)
  })

  test.afterAll(async () => {
    if (!hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('suspending a member locks them out on next load; reactivating restores access', async ({ page }) => {
    const staff = await createActiveUser({ email: testEmail('suspend'), role: 'staff' })

    await login(page, { email: staff.email, password: staff.password })

    const suspend = await callRpc(
      'admin_update_member_status',
      { member_id: staff.id, new_status: 'suspended' },
      ownerToken
    )
    expect(suspend.status).toBe(200)

    await page.reload()
    await expect(page).toHaveURL(/\/unauthorized/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()

    const reactivate = await callRpc(
      'admin_update_member_status',
      { member_id: staff.id, new_status: 'active' },
      ownerToken
    )
    expect(reactivate.status).toBe(200)

    // /unauthorized is a public route, so reloading it does not bounce back;
    // navigating into the app proves access was restored.
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({ timeout: 15_000 })
  })

  test('a suspended member loses business-table access immediately', async () => {
    const staff = await createActiveUser({ email: testEmail('rls-suspended'), role: 'staff' })
    const token = await accessTokenFor(staff.email, staff.password)
    await callRpc('admin_update_member_status', { member_id: staff.id, new_status: 'suspended' }, ownerToken)

    // Business reads are filtered to zero rows by RLS.
    const read = await restRequest('customers?select=id&limit=5', { token })
    expect(read.status).toBe(200)
    expect(read.body).toEqual([])

    // Business writes are rejected outright.
    const write = await restRequest('customers', {
      method: 'POST',
      token,
      body: { name: 'suspended-write' },
      prefer: 'return=representation',
    })
    expect([401, 403]).toContain(write.status)

    // ...but the member can still read their own profile, so the app can route
    // them to /unauthorized rather than looping on the login screen.
    const self = await restRequest(`employees?select=id,status&id=eq.${staff.id}`, { token })
    expect(self.status).toBe(200)
    expect(self.body).toEqual([{ id: staff.id, status: 'suspended' }])
  })

  test('an admin cannot suspend another admin', async () => {
    const actor = await createActiveUser({ email: testEmail('admin-actor'), role: 'admin' })
    const target = await createActiveUser({ email: testEmail('admin-target'), role: 'admin' })
    const actorToken = await accessTokenFor(actor.email, actor.password)

    const res = await callRpc(
      'admin_update_member_status',
      { member_id: target.id, new_status: 'suspended' },
      actorToken
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(JSON.stringify(res.body)).toMatch(/admins can only manage staff|not authorized/i)
  })

  test('admin "Remove member" suspends; owner "Remove member" purges', async ({ page }) => {
    const admin = await createActiveUser({ email: testEmail('remove-admin'), role: 'admin' })
    const staff = await createActiveUser({ email: testEmail('remove-staff'), role: 'staff' })

    // Admin path: remove = suspend (row kept).
    await login(page, { email: admin.email, password: admin.password })
    await page.goto('/team')
    const staffRow = page.getByRole('row', { name: new RegExp(staff.email) })
    await staffRow.getByRole('button', { name: 'Member options' }).click()
    await page.getByRole('button', { name: 'Remove member' }).click()
    await expect(page.getByText('Member suspended')).toBeVisible({ timeout: 10_000 })
    expect((await getEmployeeById(staff.id))?.status).toBe('suspended')

    // Owner path: remove = purge (row gone, auth user left orphaned).
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await login(page, { email: OWNER_EMAIL, password: OWNER_PASSWORD })

    await page.goto('/team')
    const suspendedRow = page.getByRole('row', { name: new RegExp(staff.email) })
    await suspendedRow.getByRole('button', { name: 'Member options' }).click()
    await page.getByRole('button', { name: 'Remove member' }).click()
    await expect(page.getByText('Member removed')).toBeVisible({ timeout: 10_000 })

    expect(await getEmployeeById(staff.id)).toBeNull()
    // Documents the known orphan: purge does not delete the auth.users row.
    expect(await getAuthUserByEmail(staff.email)).not.toBeNull()
  })
})
