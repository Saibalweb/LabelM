import { expect, test } from '@playwright/test'

test('login page renders with trial-mode-agnostic sign-in form', async ({ page }) => {
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Sign in' })
  ).toBeVisible()
  await expect(page.getByLabel('Work email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
})

test('trial mode intercepts the magic-link flow with a coming-soon toast', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Email me a magic link' }).click()
  await expect(page.getByText('Magic link is available in the final delivery.')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('trial mode intercepts the forgot-password flow with a coming-soon toast', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page.getByText('Password reset is available in the final delivery.')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('unknown route falls back to the app root', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page).toHaveURL(/\//)
})