import { expect, test } from '@playwright/test'
import { addCustomer, createLabel, login, selectCustomerById, stubPrint } from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)
const custName = `E2E Label Cust ${suffix}`

test('label lifecycle: create → preview → edit → print', async ({ page }) => {
  stubPrint(page)
  await login(page)

  await addCustomer(page, { name: custName, rate: '100' })

  // Grab the generated customer id from the table
  const row = page.getByRole('row', { name: new RegExp(custName) })
  const customerId = (await row.locator('td').first().innerText()).trim()

  // Create a label
  await createLabel(page, { customerId, weight: '5' })
  await expect(page.getByText(new RegExp('SL No: LBL-'))).toBeVisible()
  await expect(page.getByText('₹500.00')).toBeVisible()

  // Edit: change weight to 10 → amount recomputes to 1000
  await page.getByRole('button', { name: 'Edit Label' }).click()
  const weightInput = page.getByLabel('Weight (kg)')
  await weightInput.fill('10')
  await expect(page.getByText('₹1,000.00')).toBeVisible()
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Label updated')).toBeVisible()
  await expect(page.getByText('₹1,000.00')).toBeVisible()

  // Print flips draft → printed (PATCH to /labels)
  const patchRequest = page.waitForRequest(
    (req) => req.url().includes('/rest/v1/labels') && req.method() === 'PATCH',
    { timeout: 10_000 }
  )
  await page.getByRole('button', { name: 'Print Label' }).click()
  await patchRequest
})

test('label create validation requires weight and customer', async ({ page }) => {
  stubPrint(page)
  await login(page)

  // No customer selected → error toast
  await page.goto('/create')
  await page.getByPlaceholder('0.00').fill('5')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await expect(page.getByText('Select a customer by pressing their number.')).toBeVisible()

  // Zero weight → error toast
  await addCustomer(page, { name: `${custName} B`, rate: '50' })
  const row = page.getByRole('row', { name: new RegExp(`${custName} B`) })
  const customerId = (await row.locator('td').first().innerText()).trim()
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.getByPlaceholder('0.00').fill('0')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await expect(page.getByText('Enter a valid weight.')).toBeVisible()
})