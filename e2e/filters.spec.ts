import { expect, test } from '@playwright/test'
import { addCustomer, createLabel, login, stubPrint } from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)
const custName = `E2E Filter Cust ${suffix}`

async function createLabelCapture(page: import('@playwright/test').Page, customerId: string, weight: string) {
  await createLabel(page, { customerId, weight })
  const text = await page.getByText(/SL No: LBL-/).innerText()
  return text.replace('SL No: ', '').trim()
}

test('dashboard search, filters, presets and sorting', async ({ page }) => {
  stubPrint(page)
  await login(page)

  await addCustomer(page, { name: custName, rate: '100' })
  const row = page.getByRole('row', { name: new RegExp(custName) })
  const customerId = (await row.locator('td').first().innerText()).trim()

  // Create labels in a known creation order: amounts 500, 100, 1000
  const first = await createLabelCapture(page, customerId, '5') // amount 500 (created 1st)
  const second = await createLabelCapture(page, customerId, '1') // amount 100 (created 2nd)
  const third = await createLabelCapture(page, customerId, '10') // amount 1000 (created last)

  await page.goto('/')

  // Search narrows the list to this customer's labels
  const search = page.getByPlaceholder('Search customer, SL No or date...')
  await search.fill(custName)
  await expect(page.getByText(/Showing 1-3 of 3/)).toBeVisible({ timeout: 10_000 })

  // Default newest sort shows the last-created label first (same date, id desc)
  let rows = page.locator('[role="button"]').filter({ hasText: /#LBL-/ })
  await expect(rows.first()).toContainText(`#${third}`)

  // Sort: amount low → high brings the 100-amount label first
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('combobox').selectOption('Amount: Low → High')
  await page.getByRole('button', { name: /Apply Filters/ }).click()
  rows = page.locator('[role="button"]').filter({ hasText: /#LBL-/ })
  await expect(rows.first()).toContainText(`#${second}`)

  // Sort: amount high → low brings the 1000-amount label first
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('combobox').selectOption('Amount: High → Low')
  await page.getByRole('button', { name: /Apply Filters/ }).click()
  rows = page.locator('[role="button"]').filter({ hasText: /#LBL-/ })
  await expect(rows.first()).toContainText(`#${third}`)

  // Unprinted preset applies (all three are drafts) and shows the active badge
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: /Unprinted Batches/ }).click()
  await expect(page.getByText('1 active')).toBeVisible()
  await page.getByRole('button', { name: /Unprinted Batches/ }).click()
  await expect(page.getByText('1 active')).not.toBeVisible()

  // Min amount 200 hides the 100-amount label (price range is the 2nd "0" input)
  const minAmount = page.getByPlaceholder('0').nth(1)
  await minAmount.fill('200')
  await page.getByRole('button', { name: /Apply Filters/ }).click()
  await expect(page.getByText(/Showing 1-2 of 2/)).toBeVisible({ timeout: 10_000 })

  // Empty results state
  await search.fill('zzz-no-match-zzz')
  await expect(page.getByText('No labels match your search.')).toBeVisible({ timeout: 10_000 })

  // Reset all restores the full (unfiltered) list; re-scope via search
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: /Reset All/ }).click()
  await search.fill(custName)
  await expect(page.getByText(/Showing 1-3 of 3/)).toBeVisible({ timeout: 10_000 })

  // Sanity: the label rows exist for all three created labels
  await expect(page.getByText(`#${first}`)).toBeVisible()
  await expect(page.getByText(`#${second}`)).toBeVisible()
  await expect(page.getByText(`#${third}`)).toBeVisible()
})