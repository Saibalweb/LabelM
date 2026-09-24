import { expect, test } from '@playwright/test'
import { login } from './helpers'

test.describe.configure({ mode: 'serial' })

test('team route shows the coming-soon stub instead of real invites in trial mode', async ({
  page,
}) => {
  await login(page)
  await page.goto('/team')

  await expect(page.getByRole('heading', { name: 'Team management' })).toBeVisible()
  await expect(
    page.getByText('Inviting teammates and managing roles is coming in the final delivery.')
  ).toBeVisible()
  await expect(page.getByText('Available in the final delivery')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to dashboard' })).toBeVisible()

  // No real invite UI is exposed
  await expect(page.getByRole('button', { name: /invite/i })).toHaveCount(0)
})

test('back to dashboard returns to the labels list', async ({ page }) => {
  await login(page)
  await page.goto('/team')
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible()
})