import { expect, test } from '@playwright/test'
import { login } from './helpers'

test.describe.configure({ mode: 'serial' })

test('logs in with valid credentials and lands on the dashboard', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible()
})

test('shows an inline error for a wrong password', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Work email').fill('saibalkole@gmail.com')
  await page.getByLabel('Password', { exact: true }).fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Incorrect email or password.')).toBeVisible()
})

test('redirects a logged-out visitor to /login and preserves the from path', async ({ page }) => {
  await page.goto('/customers')
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('Work email').fill('saibalkole@gmail.com')
  await page.getByLabel('Password', { exact: true }).fill('ChangeMe123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/customers/)
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible()
})

test('logs out and returns to the login page', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'User menu' }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 15_000 })
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

test('forgot-password page is directly reachable in trial mode (email flow not gated here)', async ({ page }) => {
  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
})