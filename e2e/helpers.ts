import { expect, type Page } from '@playwright/test'

export const OWNER_EMAIL = 'saibalkole@gmail.com'
export const OWNER_PASSWORD = 'ChangeMe123!'

export function stubPrint(page: Page) {
  return page.addInitScript(() => {
    window.print = () => {}
  })
}

export async function login(
  page: Page,
  { email = OWNER_EMAIL, password = OWNER_PASSWORD } = {}
) {
  await page.goto('/login')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Recent Labels' })).toBeVisible({
    timeout: 15_000,
  })
}

export async function addCustomer(
  page: Page,
  { name, rate }: { name: string; rate: string }
) {
  await page.goto('/customers')
  await page.getByRole('button', { name: 'New Customer' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Rate (₹ per kg)').fill(rate)
  await page.getByRole('button', { name: 'Add Customer' }).click()
  await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })
}

export async function selectCustomerById(page: Page, customerId: string) {
  await page.getByPlaceholder('Press customer number (e.g. 1)').fill(customerId)
  const listItem = page
    .getByRole('button', { name: new RegExp(`^${customerId}\\b`) })
    .first()
  await expect(listItem).toBeVisible({ timeout: 10_000 })
  await listItem.click()
  await expect(page.getByText(new RegExp(`^#${customerId} `))).toBeVisible({
    timeout: 10_000,
  })
}

export async function createLabel(
  page: Page,
  { customerId, weight }: { customerId: string; weight: string }
) {
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.getByPlaceholder('0.00').fill(weight)
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await page.waitForURL(/\/preview\/\d+/, { timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Print Label' })).toBeVisible()
}

export function customerIdFromName(page: Page, name: string): Promise<string> {
  return page
    .getByRole('row', { name: new RegExp(name) })
    .locator('td')
    .first()
    .innerText()
}