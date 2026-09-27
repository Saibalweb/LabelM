// Auth E2E — invite lifecycle edge cases.
//
// Tier 1 (deterministic): the real `invite-user` / `revoke-user` Edge Functions
// are invoked over HTTP with real member JWTs, so their authorization and
// validation logic is under test. Emails are never read here — accept links are
// minted via the Admin API (see fixtures/admin.ts) and used only where the
// accept flow itself is the subject.
//
// Runs against STAGING only; requires SUPABASE_SERVICE_ROLE_KEY in the shell.
// Real-SMTP delivery (ZeptoMail -> YOPmail) is a separate, opt-in suite.

import { expect, test } from '@playwright/test'
import {
  acceptInviteUrl,
  accessTokenFor,
  admin,
  assertStaging,
  cleanupTrackedUsers,
  cleanupUsersByEmailPrefix,
  countEmployeesByEmail,
  createActiveUser,
  createInvitedUser,
  getAuthUserByEmail,
  getEmployeeByEmail,
  getEmployeeById,
  hasServiceRole,
  invokeFunction,
  mintLink,
  setEmployeeStatus,
} from './fixtures/admin'
import { EMAIL_PREFIX, OWNER_EMAIL, OWNER_PASSWORD, TEST_PASSWORD, testEmail } from './fixtures/identities'

const MISSING_KEY = 'SUPABASE_SERVICE_ROLE_KEY not set — auth E2E requires the staging service role'

test.describe('invite-user edge cases', () => {
  test.skip(!hasServiceRole, MISSING_KEY)

  let ownerToken = ''
  let adminToken = ''
  let staffToken = ''

  test.beforeAll(async () => {
    if (!hasServiceRole) return
    assertStaging()
    ownerToken = await accessTokenFor(OWNER_EMAIL, OWNER_PASSWORD)
    const adminUser = await createActiveUser({ email: testEmail('admin'), role: 'admin' })
    const staffUser = await createActiveUser({ email: testEmail('staff'), role: 'staff' })
    adminToken = await accessTokenFor(adminUser.email, adminUser.password)
    staffToken = await accessTokenFor(staffUser.email, staffUser.password)
  })

  test.afterAll(async () => {
    if (!hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('owner invites a staff member', async () => {
    const email = testEmail('invite-staff')
    const res = await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    expect(res.status).toBe(200)
    expect(res.body?.ok).toBe(true)

    const row = await getEmployeeByEmail(email)
    expect(row?.status).toBe('invited')
    expect(row?.role).toBe('staff')
  })

  test('owner invites an admin', async () => {
    const email = testEmail('invite-admin')
    const res = await invokeFunction('invite-user', { email, role: 'admin' }, ownerToken)
    expect(res.status).toBe(200)
    expect((await getEmployeeByEmail(email))?.role).toBe('admin')
  })

  test('admin can invite staff but not admins', async () => {
    const staffEmail = testEmail('admin-invites-staff')
    const staffRes = await invokeFunction('invite-user', { email: staffEmail, role: 'staff' }, adminToken)
    expect(staffRes.status).toBe(200)

    const adminEmail = testEmail('admin-invites-admin')
    const adminRes = await invokeFunction('invite-user', { email: adminEmail, role: 'admin' }, adminToken)
    expect(adminRes.status).toBe(403)
    expect(await getEmployeeByEmail(adminEmail)).toBeNull()
  })

  test('re-inviting a pending invite resends without creating a duplicate row', async () => {
    test.fail(
      true,
      'KNOWN BUG: inviteUserByEmail returns success (no error) for an already-invited user, so invite-user skips its resend branch and the INSERT hits employees_pkey'
    )
    const email = testEmail('resend')
    expect((await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)).status).toBe(200)

    const second = await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    expect(second.status).toBe(200)
    expect(second.body?.ok).toBe(true)
    expect(await countEmployeesByEmail(email)).toBe(1)
  })

  test('re-inviting an active member returns 409', async () => {
    const user = await createActiveUser({ email: testEmail('active-conflict'), role: 'staff' })
    const res = await invokeFunction('invite-user', { email: user.email, role: 'staff' }, ownerToken)
    expect(res.status).toBe(409)
  })

  test('re-inviting a suspended member returns 409', async () => {
    const user = await createActiveUser({ email: testEmail('suspended-conflict'), role: 'staff' })
    await setEmployeeStatus(user.id, 'suspended')
    const res = await invokeFunction('invite-user', { email: user.email, role: 'staff' }, ownerToken)
    expect(res.status).toBe(409)
  })

  test('invalid email, owner role, and missing token are rejected', async () => {
    const badEmail = await invokeFunction('invite-user', { email: 'not-an-email', role: 'staff' }, ownerToken)
    expect(badEmail.status).toBe(400)

    const ownerRole = await invokeFunction('invite-user', { email: testEmail('owner-role'), role: 'owner' }, ownerToken)
    expect(ownerRole.status).toBe(400)

    const noToken = await invokeFunction('invite-user', { email: testEmail('no-token'), role: 'staff' })
    expect(noToken.status).toBe(401)
  })

  test('a suspended caller is rejected', async () => {
    const user = await createActiveUser({ email: testEmail('suspended-caller'), role: 'staff' })
    const token = await accessTokenFor(user.email, user.password)
    await setEmployeeStatus(user.id, 'suspended')

    const res = await invokeFunction('invite-user', { email: testEmail('from-suspended'), role: 'staff' }, token)
    expect(res.status).toBe(403)
  })

  test('email is normalized to lowercase', async () => {
    const mixed = `LabelM-E2E-${Date.now().toString(36)}-Case@YOPMAIL.COM`
    const res = await invokeFunction('invite-user', { email: mixed, role: 'staff' }, ownerToken)
    expect(res.status).toBe(200)
    const row = await getEmployeeByEmail(mixed.toLowerCase())
    expect(row?.email).toBe(mixed.toLowerCase())
  })

  // KNOWN BUG (authPlan §3: staff cannot invite). The function only blocks
  // non-active callers and admin-granting; it never requires owner/admin. This
  // test is marked as an expected failure so the suite stays green until fixed.
  test('staff caller cannot invite staff', async () => {
    test.fail(true, 'KNOWN BUG: invite-user does not require owner/admin for staff invites')
    const res = await invokeFunction('invite-user', { email: testEmail('staff-invite-by-staff'), role: 'staff' }, staffToken)
    expect(res.status).toBe(403)
  })
})

test.describe('revoke-user edge cases', () => {
  test.skip(!hasServiceRole, MISSING_KEY)

  let ownerToken = ''
  let adminToken = ''

  test.beforeAll(async () => {
    if (!hasServiceRole) return
    assertStaging()
    ownerToken = await accessTokenFor(OWNER_EMAIL, OWNER_PASSWORD)
    const adminUser = await createActiveUser({ email: testEmail('revoke-admin'), role: 'admin' })
    adminToken = await accessTokenFor(adminUser.email, adminUser.password)
  })

  test.afterAll(async () => {
    if (!hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('owner revokes a pending invite: profile and auth user are removed', async () => {
    const email = testEmail('revoke')
    await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    const row = await getEmployeeByEmail(email)
    expect(row).not.toBeNull()
    expect(await getAuthUserByEmail(email)).not.toBeNull()

    const res = await invokeFunction('revoke-user', { memberId: row!.id }, ownerToken)
    expect(res.status).toBe(200)
    expect(await getEmployeeById(row!.id)).toBeNull()
    expect(await getAuthUserByEmail(email)).toBeNull()
  })

  test('re-invite after revoke succeeds (fresh auth user)', async () => {
    const email = testEmail('revoke-reinvite')
    await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    const row = await getEmployeeByEmail(email)
    await invokeFunction('revoke-user', { memberId: row!.id }, ownerToken)

    const again = await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    expect(again.status).toBe(200)
    expect((await getEmployeeByEmail(email))?.status).toBe('invited')
  })

  test('invite self-heals an orphaned auth user (purge left it behind)', async () => {
    const user = await createActiveUser({ email: testEmail('orphan'), role: 'staff' })
    // Simulate a purge: drop the employees row but leave auth.users intact.
    await admin().from('employees').delete().eq('id', user.id)
    expect(await getEmployeeByEmail(user.email)).toBeNull()
    expect(await getAuthUserByEmail(user.email)).not.toBeNull()

    const res = await invokeFunction('invite-user', { email: user.email, role: 'staff' }, ownerToken)
    expect(res.status).toBe(200)
    expect((await getEmployeeByEmail(user.email))?.status).toBe('invited')
  })

  test('cannot revoke an active member (409)', async () => {
    const user = await createActiveUser({ email: testEmail('revoke-active'), role: 'staff' })
    const res = await invokeFunction('revoke-user', { memberId: user.id }, ownerToken)
    expect(res.status).toBe(409)
    expect(await getEmployeeById(user.id)).not.toBeNull()
  })

  test('admin revokes a staff invite but not an admin invite', async () => {
    const staffInvite = await createInvitedUser({ email: testEmail('revoke-staff'), role: 'staff' })
    const okRes = await invokeFunction('revoke-user', { memberId: staffInvite.id }, adminToken)
    expect(okRes.status).toBe(200)

    const adminInvite = await createInvitedUser({ email: testEmail('revoke-admin-target'), role: 'admin' })
    const denied = await invokeFunction('revoke-user', { memberId: adminInvite.id }, adminToken)
    expect(denied.status).toBe(403)
    expect(await getEmployeeById(adminInvite.id)).not.toBeNull()
  })

  test('the owner cannot be revoked', async () => {
    const owner = await getEmployeeByEmail(OWNER_EMAIL)
    const res = await invokeFunction('revoke-user', { memberId: owner!.id }, ownerToken)
    // The owner is active, so the pending-invite guard (409) fires before the
    // role guard. Either way the owner is not revoked.
    expect([403, 409]).toContain(res.status)
    expect(await getEmployeeById(owner!.id)).not.toBeNull()
  })

  test('unknown member id is a 404 and a missing token is a 401', async () => {
    const notFound = await invokeFunction(
      'revoke-user',
      { memberId: '00000000-0000-0000-0000-000000000000' },
      ownerToken
    )
    expect(notFound.status).toBe(404)

    const noToken = await invokeFunction('revoke-user', { memberId: '00000000-0000-0000-0000-000000000000' })
    expect(noToken.status).toBe(401)
  })

  // KNOWN BUG (authPlan §3: only owner/admin manage members). revoke-user checks
  // only that the caller is active, never their role, so staff can revoke.
  test('staff caller cannot revoke an invite', async () => {
    test.fail(true, 'KNOWN BUG: revoke-user does not require owner/admin')
    const staffCaller = await createActiveUser({ email: testEmail('revoke-staff-caller'), role: 'staff' })
    const staffCallerToken = await accessTokenFor(staffCaller.email, staffCaller.password)
    const invite = await createInvitedUser({ email: testEmail('revoke-by-staff'), role: 'staff' })

    const res = await invokeFunction('revoke-user', { memberId: invite.id }, staffCallerToken)
    expect(res.status).toBe(403)
  })
})

test.describe('accept-invite flow', () => {
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

  test('invited user accepts and becomes active', async ({ page }) => {
    const base = test.info().project.use.baseURL as string
    const email = testEmail('accept')
    await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)

    const link = await mintLink('invite', email, `${base}/accept-invite`)
    await page.goto(acceptInviteUrl(base, link.hashedToken, email))

    await page.getByLabel('Full name').fill('E2E Accept')
    await page.getByLabel('Create password').fill(TEST_PASSWORD)
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Accept invitation & sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({ timeout: 15_000 })
    const row = await getEmployeeByEmail(email)
    expect(row?.status).toBe('active')
    expect(row?.full_name).toBe('E2E Accept')
  })

  test('a revoked invite link can no longer be accepted', async ({ page }) => {
    const base = test.info().project.use.baseURL as string
    const email = testEmail('accept-revoked')
    await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    const row = await getEmployeeByEmail(email)

    const link = await mintLink('invite', email, `${base}/accept-invite`)
    await page.goto(acceptInviteUrl(base, link.hashedToken, email))
    await expect(page.getByLabel('Full name')).toBeVisible()

    // Revoke while the invitee sits on the accept page.
    expect((await invokeFunction('revoke-user', { memberId: row!.id }, ownerToken)).status).toBe(200)

    await page.getByLabel('Full name').fill('Too Late')
    await page.getByLabel('Create password').fill(TEST_PASSWORD)
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Accept invitation & sign in' }).click()

    await expect(page.getByText(/expired|invalid|not found|token/i)).toBeVisible({ timeout: 10_000 })
  })

  test('a tampered token fails verification', async ({ page }) => {
    const base = test.info().project.use.baseURL as string
    await page.goto(acceptInviteUrl(base, 'tampered-token-value', testEmail('tampered')))

    await page.getByLabel('Full name').fill('Tampered User')
    await page.getByLabel('Create password').fill(TEST_PASSWORD)
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Accept invitation & sign in' }).click()

    await expect(page.getByText(/expired|invalid|not found|token/i)).toBeVisible({ timeout: 10_000 })
  })

  test('a link without type=invite shows the invalid state', async ({ page }) => {
    const base = test.info().project.use.baseURL as string
    await page.goto(`${base}/accept-invite?token_hash=anything`)
    await expect(page.getByRole('heading', { name: /Invitation link invalid/i })).toBeVisible()
  })
})

test.describe('team page invite UI', () => {
  test.skip(!hasServiceRole, MISSING_KEY)

  test.afterAll(async () => {
    if (!hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('owner invites and revokes from the Team page', async ({ page }) => {
    assertStaging()
    const email = testEmail('team-ui')

    await page.goto('/login')
    await page.getByLabel('Work email').fill(OWNER_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill(OWNER_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({ timeout: 15_000 })

    await page.goto('/team')
    await page.getByRole('button', { name: 'Invite member' }).click()
    await page.getByLabel('Work email address').fill(email)
    await page.getByRole('button', { name: 'Send invitation' }).click()

    const row = page.getByRole('row', { name: new RegExp(email) })
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row.getByText('Invited')).toBeVisible()

    await row.getByRole('button', { name: 'Member options' }).click()
    await page.getByRole('button', { name: 'Revoke invite' }).click()
    await expect(row).toHaveCount(0, { timeout: 10_000 })
    expect(await getEmployeeByEmail(email)).toBeNull()
  })
})
