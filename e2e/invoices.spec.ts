import { expect, test } from '@playwright/test'
import { addCustomer, createLabel, login, selectCustomerById, stubPrint } from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)
const custName = `E2E Inv Cust ${suffix}`
const bulkCustName = `E2E Inv Bulk ${suffix}`
const emptyCustName = `E2E Empty ${suffix}`

test('invoice wizard, payment lifecycle and status recalculation', async ({ page }) => {
  stubPrint(page)
  await login(page)

  await addCustomer(page, { name: custName, rate: '200' })
  const row = page.getByRole('row', { name: new RegExp(custName) })
  const customerId = (await row.locator('td').first().innerText()).trim()

  // Two labels → total 8kg × ₹200 = ₹1,600
  await createLabel(page, { customerId, weight: '5' })
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.getByPlaceholder('0.00').fill('3')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await page.waitForURL(/\/preview\/\d+/)

  // Wizard: pick customer, review labels, generate
  await page.goto('/invoice/new')
  await page.getByPlaceholder('Search customer by name or ID...').fill(custName)
  await page.getByRole('button', { name: new RegExp(custName) }).first().click()
  await expect(page.getByText('2 of 2 labels selected')).toBeVisible({ timeout: 10_000 })

  const total = page.getByText('₹1,600.00')
  await expect(total).toBeVisible()
  await page.getByRole('button', { name: 'Generate Invoice' }).click()

  await page.waitForURL(/\/invoice\/\d+/, { timeout: 15_000 })
  await expect(page.getByText('Unpaid', { exact: true })).toBeVisible()
  await expect(page.getByText('₹1,600.00').first()).toBeVisible()
  await expect(page.getByText('₹0.00').first()).toBeVisible() // paid amount

  // Record a partial payment → Partial
  await page.getByRole('button', { name: 'Record Payment' }).click()
  await page.getByLabel('Amount (₹)').fill('600')
  await page.getByRole('button', { name: 'UPI' }).click()
  await page.getByRole('button', { name: 'Save Payment' }).click()
  await expect(page.getByText('Partial', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('₹600.00').first()).toBeVisible()
  // Payment history attributes the payment to the recording employee
  await expect(page.getByText(/· by /).first()).toBeVisible()

  // Record the remainder → Paid
  await page.getByRole('button', { name: 'Record Payment' }).click()
  await page.getByLabel('Amount (₹)').fill('1000')
  await page.getByRole('button', { name: 'Cash' }).click()
  await page.getByRole('button', { name: 'Save Payment' }).click()
  await expect(page.getByText('Paid', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Fully paid')).toBeVisible()

  // Billed labels are locked on the preview page
  await page.goto('/')
  await page.getByPlaceholder('Search customer or SL No..').fill(custName)
  await expect(page.getByText(/Showing 1-2 of 2/)).toBeVisible({ timeout: 10_000 })
  await page.locator('[role="button"]').filter({ hasText: /#LBL-/ }).first().click()
  await page.waitForURL(/\/preview\/\d+/)
  await expect(page.getByRole('button', { name: 'Invoiced — Locked' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit Label' })).toHaveCount(0)
})

test('bulk generation skips customers with no uninvoiced labels', async ({ page }) => {
  stubPrint(page)
  await login(page)

  // Use a unique past month so this spec is isolated from other specs' labels
  const month = '2026-01'
  const from = '2026-01-01'
  const to = '2026-02-01'

  await addCustomer(page, { name: bulkCustName, rate: '100' })
  const row = page.getByRole('row', { name: new RegExp(bulkCustName) })
  const customerId = (await row.locator('td').first().innerText()).trim()
  await addCustomer(page, { name: emptyCustName, rate: '100' })

  // One label in the past month for the first customer
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.locator('input[type="date"]').fill(`${month}-15`)
  await page.getByPlaceholder('0.00').fill('2')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await page.waitForURL(/\/preview\/\d+/)

  await page.goto('/invoice')
  await page.getByRole('button', { name: /Generate for All/ }).click()
  const bulkDialog = page.getByRole('dialog')
  await bulkDialog.getByRole('button', { name: 'Custom Range' }).click()
  await bulkDialog.locator('input[type="date"]').nth(0).fill(from)
  await bulkDialog.locator('input[type="date"]').nth(1).fill(to)
  await page.getByRole('button', { name: 'Preview' }).click()
  // The preview lists every customer with uninvoiced labels in this period
  await expect(bulkDialog.getByText(bulkCustName)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /Generate \d+ invoices/ }).click()
  await expect(page.getByText(/Created — \d+/)).toBeVisible({ timeout: 20_000 })
  // Our uniquely-named customer's invoice is among the created ones
  await expect(bulkDialog.getByText(bulkCustName)).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
})

test('overdue pill filters invoices past their due date', async ({ page }) => {
  stubPrint(page)
  await login(page)

  const overdueCust = `${custName} Overdue`
  await addCustomer(page, { name: overdueCust, rate: '50' })
  const row = page.getByRole('row', { name: new RegExp(overdueCust) })
  const customerId = (await row.locator('td').first().innerText()).trim()

  // Label dated in May 2026; pick a past custom due date so the invoice is overdue
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.locator('input[type="date"]').fill('2026-05-15')
  await page.getByPlaceholder('0.00').fill('4')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await page.waitForURL(/\/preview\/\d+/)

  await page.goto('/invoice/new')
  await page.getByPlaceholder('Search customer by name or ID...').fill(overdueCust)
  await page.getByRole('button', { name: new RegExp(overdueCust) }).first().click()
  await page.locator('input[type="month"]').fill('2026-05')
  await expect(page.getByText('1 of 1 labels selected')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.locator('input[type="date"]').fill('2026-06-30')
  await page.getByRole('button', { name: 'Generate Invoice' }).click()
  await page.waitForURL(/\/invoice\/\d+/, { timeout: 15_000 })
  await expect(page.getByText('Unpaid', { exact: true })).toBeVisible()

  await page.goto('/invoice')
  await page.getByRole('button', { name: 'Overdue', exact: true }).click()
  await expect(page.getByText(overdueCust)).toBeVisible({ timeout: 10_000 })
})

test('generate invoice requires a customer and labels', async ({ page }) => {
  await login(page)
  await page.goto('/invoice/new')
  const generate = page.getByRole('button', { name: 'Generate Invoice' })
  await expect(generate).toBeDisabled()
  await expect(page.getByText('Select a customer to continue.')).toBeVisible()
})