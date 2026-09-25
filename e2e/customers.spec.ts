import { expect, test } from '@playwright/test'
import { login, stubPrint } from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)
const custName = `E2E Cust ${suffix}`
const delName = `E2E Del ${suffix}`

test('customer CRUD: create, search, edit, rate change', async ({ page }) => {
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
})

test('admin delete archives a customer and restore brings it back', async ({ page }) => {
  stubPrint(page)
  await login(page)

  // Create
  await page.goto('/customers')
  await page.getByRole('button', { name: 'New Customer' }).click()
  await page.getByLabel('Name').fill(delName)
  await page.getByLabel('Rate (₹ per kg)').fill('60')
  await page.getByRole('button', { name: 'Add Customer' }).click()
  const row = page.getByRole('row', { name: new RegExp(delName) })
  await expect(row).toBeVisible({ timeout: 10_000 })

  // Danger delete flow: menu -> confirmation modal -> confirm
  await row.getByRole('button', { name: `Actions for ${delName}` }).click()
  await page.getByRole('button', { name: 'Delete customer' }).click()
  await expect(page.getByRole('heading', { name: 'Delete customer?' })).toBeVisible()
  await expect(page.getByText(/Only an owner or admin can restore/)).toBeVisible()
  await expect(page.getByText(/All labels, invoices, payments and unpaid dues/)).toBeVisible()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Delete customer' }).click()

  // Archived: the customer now appears in the "Deleted customers" section
  const deletedRow = page
    .getByRole('row')
    .filter({ hasText: delName })
    .filter({ has: page.getByRole('button', { name: 'Restore' }) })
  await expect(deletedRow).toBeVisible({ timeout: 10_000 })

  // Restore brings it back to the active list (no longer has a Restore button)
  await deletedRow.getByRole('button', { name: 'Restore' }).click()
  await expect(
    page
      .getByRole('row', { name: new RegExp(delName) })
      .filter({ hasNot: page.getByRole('button', { name: 'Restore' }) })
  ).toBeVisible({ timeout: 10_000 })
  await expect(deletedRow).toHaveCount(0)
})

test('customer form requires a name', async ({ page }) => {
  await login(page)
  await page.goto('/customers')
  await page.getByRole('button', { name: 'New Customer' }).click()
  await page.getByRole('button', { name: 'Add Customer' }).click()
  await expect(page.getByText('Customer name is required.')).toBeVisible()
})