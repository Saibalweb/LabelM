import { expect, test } from '@playwright/test'
import { login } from './helpers'

test.describe.configure({ mode: 'serial' })

test('visits every core route as an authenticated owner', async ({ page }) => {
  await login(page)

  const routes: Array<[string, string]> = [
    ['/', 'Recent Labels'],
    ['/create', 'Create New Label'],
    ['/customers', 'Customers'],
    ['/invoice', 'Invoices'],
    ['/invoice/new', 'Generate Invoice'],
    ['/dues', 'Dues Overview'],
    ['/settings', 'Settings'],
  ]
  for (const [path, heading] of routes) {
    await page.goto(path)
    await expect(
      page.getByRole('main').getByRole('heading', { name: heading, exact: true })
    ).toBeVisible()
  }
})

test('team route shows the trial-mode coming-soon screen', async ({ page }) => {
  await login(page)
  await page.goto('/team')
  await expect(page.getByText('Available in the final delivery')).toBeVisible()
})

test('unknown routes fall back to the dashboard', async ({ page }) => {
  await login(page)
  await page.goto('/definitely-not-a-route')
  await expect(page).toHaveURL(/\//)
  await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible()
})

test('back buttons navigate to the parent page', async ({ page }) => {
  await login(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/create')
  await page.getByRole('button', { name: 'Go back' }).click()
  await expect(page).toHaveURL(/\//)

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/invoice/new')
  await page.getByRole('button', { name: 'Back to Invoices' }).click()
  await expect(page).toHaveURL(/\/invoice/)
})