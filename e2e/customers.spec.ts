import { expect, test } from '@playwright/test'
import { login, stubPrint } from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)
const custName = `E2E Cust ${suffix}`

test('customer CRUD: create, search, edit, rate change, soft-delete', async ({ page }) => {
  stubPrint(page)
  await login(page)

  // Create
  await page.goto('/customers')
  await page.getByRole('button', { name: 'New Customer' }).click()
  await page.getByLabel('Name').fill(custName)
  await page.getByLabel('Phone (optional)').fill('+91 90000 11111')
  await page.getByLabel('Rate (₹ per kg)').fill('100')
  await page.getByRole('button', { name: 'Add Customer' }).click()
  const row = page.getByRole('row', { name: new RegExp(custName) })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await expect(row).toContainText('₹100.00')

  // Search
  const search = page.getByPlaceholder('Search customers...').first()
  await search.fill(custName)
  await expect(page.getByRole('row', { name: new RegExp(custName) })).toBeVisible()
  await search.fill('zzz-nothing-zzz')
  await expect(page.getByText('No customers match your search.')).toBeVisible()
  await search.fill('')

  // Rate change
  await row.getByRole('button', { name: /₹100\.00/ }).click()
  await page.getByLabel('Rate (₹ per kg)').fill('150')
  await page.getByRole('button', { name: 'Save Rate' }).click()
  await expect(row).toContainText('₹150.00', { timeout: 10_000 })

  // Edit details
  await row.getByRole('button', { name: `Actions for ${custName}` }).click()
  await page.getByRole('button', { name: 'Edit customer' }).click()
  await page.getByLabel('Phone (optional)').fill('+91 90000 22222')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(row).toContainText('+91 90000 22222', { timeout: 10_000 })

  // Soft delete
  await row.getByRole('button', { name: `Actions for ${custName}` }).click()
  await page.getByRole('button', { name: 'Delete customer' }).click()
  await expect(page.getByRole('row', { name: new RegExp(custName) })).toHaveCount(0, {
    timeout: 10_000,
  })
})

test('customer form requires a name', async ({ page }) => {
  await login(page)
  await page.goto('/customers')
  await page.getByRole('button', { name: 'New Customer' }).click()
  await page.getByRole('button', { name: 'Add Customer' }).click()
  await expect(page.getByText('Customer name is required.')).toBeVisible()
})