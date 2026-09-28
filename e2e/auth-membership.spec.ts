// Auth E2E — membership lifecycle: suspend / reactivate and the
// "can a removed user still use the site?" question.
//
// The app soft-removes members by suspending them; there is no hard delete in
// the UI (the owner-only `owner_purge_member` RPC exists but is intentionally
// not wired up — see authPlan.md §15). RLS gates every business table on the
// live `is_active_member()` check, so a suspended member's existing JWT loses
// database access immediately even though the token itself is still
// cryptographically valid.

import { expect, test } from '@playwright/test'
import {
  accessTokenFor,
  assertStaging,
  callRpc,
  cleanupTrackedUsers,
  cleanupUsersByEmailPrefix,
  createActiveUser,
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

  test('the Team UI removes members by suspension only — no hard delete', async ({ page }) => {
    const admin = await createActiveUser({ email: testEmail('remove-admin'), role: 'admin' })
    const staff = await createActiveUser({ email: testEmail('remove-staff'), role: 'staff' })

    // Admin path: the menu offers suspend, never a hard delete.
    await login(page, { email: admin.email, password: admin.password })
    await page.goto('/team')
    const staffRow = page.getByRole('row', { name: new RegExp(staff.email) })
    await staffRow.getByRole('button', { name: 'Member options' }).click()
    await expect(page.getByRole('button', { name: 'Remove member' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Suspend member' }).click()
    await expect(page.getByText('Member suspended')).toBeVisible({ timeout: 10_000 })
    expect((await getEmployeeById(staff.id))?.status).toBe('suspended')

    // Owner path: a suspended member can only be reactivated, still no hard delete.
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await login(page, { email: OWNER_EMAIL, password: OWNER_PASSWORD })

    await page.goto('/team')
    const suspendedRow = page.getByRole('row', { name: new RegExp(staff.email) })
    await suspendedRow.getByRole('button', { name: 'Member options' }).click()
    await expect(page.getByRole('button', { name: 'Remove member' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Reactivate member' }).click()
    await expect(page.getByText('Member reactivated')).toBeVisible({ timeout: 10_000 })
    expect((await getEmployeeById(staff.id))?.status).toBe('active')
  })

  test('the Team UI hides admin actions an admin may not perform', async ({ page }) => {
    const actor = await createActiveUser({ email: testEmail('ui-admin-actor'), role: 'admin' })
    const targetAdmin = await createActiveUser({ email: testEmail('ui-admin-target'), role: 'admin' })
    const targetStaff = await createActiveUser({ email: testEmail('ui-staff-target'), role: 'staff' })

    await login(page, { email: actor.email, password: actor.password })
    await page.goto('/team')

    // The signed-in admin is pinned + labelled in the list.
    await expect(
      page.getByRole('row', { name: new RegExp(actor.email) }).getByText('You')
    ).toBeVisible()

    // Another admin's menu offers no suspend/remove — only the owner may manage admins.
    await page
      .getByRole('row', { name: new RegExp(targetAdmin.email) })
      .getByRole('button', { name: 'Member options' })
      .click()
    await expect(page.getByText('Only the owner can manage admins')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suspend member' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Remove member' })).toHaveCount(0)

    // Close the custom dropdown by re-toggling it; otherwise it overlays the
    // next row's button and Playwright refuses the covered click.
    await page
      .getByRole('row', { name: new RegExp(targetAdmin.email) })
      .getByRole('button', { name: 'Member options' })
      .click()
    await expect(page.getByText('Only the owner can manage admins')).toHaveCount(0)

    // Staff remain manageable by an admin.
    await page
      .getByRole('row', { name: new RegExp(targetStaff.email) })
      .getByRole('button', { name: 'Member options' })
      .click()
    await expect(page.getByRole('button', { name: 'Suspend member' })).toBeVisible()
  })
})
