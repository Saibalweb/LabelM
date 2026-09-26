import { expect, test } from '@playwright/test'
import { addCustomer, createLabel, login, selectCustomerById, stubPrint } from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)
const custName = `E2E Dues Cust ${suffix}`

test('dues aggregation, search, sort, expand and record-payment link', async ({ page }) => {
  stubPrint(page)
  await login(page)

  await addCustomer(page, { name: custName, rate: '300' })
  const row = page.getByRole('row', { name: new RegExp(custName) })
  const customerId = (await row.locator('td').first().innerText()).trim()

  // 2 labels → ₹1,500 total
  await createLabel(page, { customerId, weight: '3' })
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.getByPlaceholder('0.00').fill('2')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await page.waitForURL(/\/preview\/\d+/)

  // Generate the invoice
  await page.goto('/invoice/new')
  await page.getByPlaceholder('Search customer by name or ID...').fill(custName)
  await page.getByRole('button', { name: new RegExp(custName) }).first().click()
  await expect(page.getByText('2 of 2 labels selected')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Generate Invoice' }).click()
  await page.waitForURL(/\/invoice\/\d+/, { timeout: 15_000 })

  // Pay part of it so a balance remains
  await page.getByRole('button', { name: 'Record Payment' }).click()
  await page.getByLabel('Amount (₹)').fill('500')
  await page.getByRole('button', { name: 'Save Payment' }).click()
  await expect(page.getByText('Partial', { exact: true })).toBeVisible({ timeout: 10_000 })

  // Dues overview aggregates this customer
  await page.goto('/dues')
  await expect(page.getByText(custName)).toBeVisible({ timeout: 10_000 })
  await expect(
    page.getByRole('button', { name: new RegExp(custName) })
  ).toContainText('₹1,000.00') // remaining due

  // Search
  const search = page.getByRole('main').getByPlaceholder('Search customer or invoice...')
  await search.fill('zzz-nope')
  await expect(page.getByText('No customers match your search.')).toBeVisible()
  await search.fill(custName)
  await expect(page.getByText(custName)).toBeVisible()

  // Sort options are functional (moved inside the filter sheet)
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('combobox').selectOption('Name A-Z')
  await page.getByRole('button', { name: /Apply Filters/ }).click()
  await expect(page.getByText(custName)).toBeVisible()

  // Expand the row to reveal the invoice
  await page.getByRole('button', { name: new RegExp(custName) }).click()
  await expect(page.getByText(/Partial \(33%\)/)).toBeVisible()

  // Record-payment link navigates to the invoice
  await page.getByRole('button', { name: 'Record Payment' }).click()
  await page.waitForURL(/\/invoice\/\d+/)
  await expect(page.getByRole('button', { name: 'Record Payment' })).toBeVisible()

  // Filters sheet applies the server-side payment-status filter
  await page.goto('/dues')
  await page.getByRole('button', { name: /Filters/ }).click()
  await expect(page.getByRole('heading', { name: 'Filter Dues' })).toBeVisible()
  await page.getByLabel('Partial').check()
  await expect(page.getByText('1 active')).toBeVisible()
  await page.getByRole('button', { name: /Apply Filters/ }).click()
  await expect(page.getByText(custName)).toBeVisible({ timeout: 10_000 })

  // Reset all restores the default view
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: /Reset All/ }).click()
  await expect(page.getByText('1 active')).not.toBeVisible()
  await expect(page.getByText(custName)).toBeVisible()
})