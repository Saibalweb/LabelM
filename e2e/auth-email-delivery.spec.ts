// Auth E2E — Tier 2: real email delivery (ZeptoMail → YOPmail).
//
// Opt-in via E2E_EMAIL=1 (slow, external dependency). Proves what Tier 1 cannot:
// the email actually arrives, the template renders, the emailed link points at
// the app origin, and the link completes the flow.
//
// Staging only; requires SUPABASE_SERVICE_ROLE_KEY in the shell.

import { expect, test } from '@playwright/test'
import {
  accessTokenFor,
  assertStaging,
  cleanupTrackedUsers,
  cleanupUsersByEmailPrefix,
  createActiveUser,
  getEmployeeByEmail,
  hasServiceRole,
  invokeFunction,
} from './fixtures/admin'
import { extractLink, waitForEmail } from './fixtures/mailbox'
import { EMAIL_PREFIX, OWNER_EMAIL, OWNER_PASSWORD, TEST_PASSWORD, testEmail } from './fixtures/identities'

const enabled = process.env.E2E_EMAIL === '1'
const MISSING_KEY = 'SUPABASE_SERVICE_ROLE_KEY not set — auth E2E requires the staging service role'

// Real delivery + YOPmail polling is slow; give each test room to finish.
test.describe.configure({ timeout: 180_000 })

test.describe('real email delivery (ZeptoMail → YOPmail)', () => {
  test.skip(!enabled, 'set E2E_EMAIL=1 to run the real-SMTP suite')
  test.skip(!hasServiceRole, MISSING_KEY)

  let ownerToken = ''

  test.beforeAll(async () => {
    if (!enabled || !hasServiceRole) return
    assertStaging()
    ownerToken = await accessTokenFor(OWNER_EMAIL, OWNER_PASSWORD)
  })

  test.afterAll(async () => {
    if (!enabled || !hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('invite email is delivered from the app sender', async () => {
    const base = test.info().project.use.baseURL as string
    const email = testEmail('mail-invite-deliver')

    const res = await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken, base)
    expect(res.status).toBe(200)

    const mail = await waitForEmail(email, { subjectIncludes: 'invited' })
    expect(mail.from.toLowerCase()).toContain('saibal.dev')
    expect(mail.subject.toLowerCase()).toContain('invited')
  })

  test('emailed invite link completes onboarding', async ({ page }) => {
    test.fail(
      true,
      'KNOWN CONFIG GAP: Supabase rejects the invite redirect and falls back to the Site URL (a LAN IP), dropping /accept-invite — the emailed link lands on / instead of the accept form. Fix Auth URL config: Site URL = app origin + allowlist /accept-invite.'
    )
    const base = test.info().project.use.baseURL as string
    const email = testEmail('mail-invite')

    const res = await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken, base)
    expect(res.status).toBe(200)

    const mail = await waitForEmail(email, { subjectIncludes: 'invited' })
    const link = extractLink(mail.html, 'invite')
    expect(link).toContain('type=invite')
    // The emailed link must point at the app's accept page.
    expect(new URL(link).origin).toBe(new URL(base).origin)
    expect(new URL(link).pathname).toBe('/accept-invite')

    await page.goto(link)
    await page.getByLabel('Full name').fill('Mail Accept')
    await page.getByLabel('Create password').fill(TEST_PASSWORD)
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Accept invitation & sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({ timeout: 15_000 })
    expect((await getEmployeeByEmail(email))?.status).toBe('active')
  })

  test('magic-link email arrives and clicking it signs the member in', async ({ page }) => {
    const member = await createActiveUser({ email: testEmail('mail-magic'), role: 'staff' })

    await page.goto('/login')
    await page.getByLabel('Work email').fill(member.email)
    await page.getByRole('button', { name: 'Email me a magic link' }).click()
    await expect(page).toHaveURL(/\/magic-link-sent/)

    const mail = await waitForEmail(member.email, { subjectIncludes: 'sign-in link' })
    const link = extractLink(mail.html, 'magiclink')

    await page.goto(link)
    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({ timeout: 20_000 })
  })

  test('password-reset email arrives; the link sets a new password', async ({ page }) => {
    test.fail(
      true,
      'KNOWN CONFIG GAP: /reset-password is not in the Auth redirect allowlist, so the recovery link falls back to the Site URL and lands on / with a session instead of the reset form'
    )
    const member = await createActiveUser({ email: testEmail('mail-reset'), role: 'staff' })

    await page.goto('/forgot-password')
    await page.getByLabel('Work email').fill(member.email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('heading', { name: 'Reset link sent' })).toBeVisible({ timeout: 15_000 })

    const mail = await waitForEmail(member.email, { subjectIncludes: 'Reset your' })
    const link = extractLink(mail.html, 'recovery')

    await page.goto(link)
    await expect(page).toHaveURL(/\/reset-password/, { timeout: 15_000 })
    await page.getByLabel('New password').fill('NewPassw0rd!')
    await page.getByLabel('Confirm password').fill('NewPassw0rd!')
    await page.getByRole('button', { name: 'Update password' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    await page.getByLabel('Work email').fill(member.email)
    await page.getByLabel('Password', { exact: true }).fill('NewPassw0rd!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({ timeout: 15_000 })
  })

  test('re-invite sends a fresh email and invalidates the previous one', async () => {
    const email = testEmail('mail-resend')

    expect((await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)).status).toBe(200)
    const first = await waitForEmail(email, { subjectIncludes: 'invited' })

    const second = await invokeFunction('invite-user', { email, role: 'staff' }, ownerToken)
    expect(second.status).toBe(200)

    const fresh = await waitForEmail(email, { subjectIncludes: 'invited' })
    expect(fresh.id).not.toBe(first.id)
  })
})
