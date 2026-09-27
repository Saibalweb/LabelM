// Auth E2E — login, magic-link request, password reset request, and the
// non-member case. Actual link consumption from a real mailbox is covered by
// the opt-in real-SMTP suite (auth-email-delivery.spec.ts).

import { expect, test } from '@playwright/test'
import {
  assertStaging,
  cleanupTrackedUsers,
  cleanupUsersByEmailPrefix,
  createActiveUser,
  createAuthUserOnly,
  hasServiceRole,
} from './fixtures/admin'
import { EMAIL_PREFIX, OWNER_EMAIL, OWNER_PASSWORD, testEmail } from './fixtures/identities'
import { login } from './helpers'


const MISSING_KEY = 'SUPABASE_SERVICE_ROLE_KEY not set — auth E2E requires the staging service role'

test.describe('login', () => {
  test.afterAll(async () => {
    if (!hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('wrong password shows an inline error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Work email').fill(OWNER_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Incorrect email or password.')).toBeVisible()
  })

  test('unknown email shows the same generic error (no enumeration)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Work email').fill(`nobody-${Date.now()}@example.com`)
    await page.getByLabel('Password', { exact: true }).fill('whatever123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Incorrect email or password.')).toBeVisible()
  })

  test('forgot-password request always confirms (no enumeration)', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel('Work email').fill(testEmail('forgot-unknown'))
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('heading', { name: 'Reset link sent' })).toBeVisible({ timeout: 15_000 })
  })

  test('magic-link request lands on the confirmation screen', async ({ page }) => {
    test.skip(!hasServiceRole, MISSING_KEY)
    assertStaging()
    const member = await createActiveUser({ email: testEmail('magic'), role: 'staff' })

    await page.goto('/login')
    await page.getByLabel('Work email').fill(member.email)
    await page.getByRole('button', { name: 'Email me a magic link' }).click()

    await expect(page).toHaveURL(/\/magic-link-sent/)
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  })
})

test.describe('non-member with valid credentials', () => {
  test.skip(!hasServiceRole, MISSING_KEY)

  test.afterAll(async () => {
    if (!hasServiceRole) return
    await cleanupTrackedUsers()
    await cleanupUsersByEmailPrefix(EMAIL_PREFIX)
  })

  test('is authenticated but bounced from the app (no employees row)', async ({ page }) => {
    assertStaging()
    const ghost = await createAuthUserOnly({ email: testEmail('ghost') })

    await page.goto('/login')
    await page.getByLabel('Work email').fill(ghost.email)
    await page.getByLabel('Password', { exact: true }).fill(ghost.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // A valid session with no profile is neither authenticated nor restricted,
    // so the app keeps them on /login rather than routing to /unauthorized.
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toHaveCount(0)

    // Deep-linking to a protected route also bounces back to /login.
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('owner session basics', () => {
  test('signs in and reaches the dashboard', async ({ page }) => {
    await login(page, { email: OWNER_EMAIL, password: OWNER_PASSWORD })
    await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible()
  })
})
