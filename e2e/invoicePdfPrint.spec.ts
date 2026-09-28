import { expect, test, type Page } from '@playwright/test'
import {
  apiCreateCustomer,
  apiCreateLabel,
  apiGenerateInvoice,
  loginCapturing,
} from './helpers'

test.describe.configure({ mode: 'serial' })

function trackPrint(page: Page) {
  return page.addInitScript(() => {
    const state = window as unknown as { __printCalls: number }
    state.__printCalls = 0
    window.print = () => {
      state.__printCalls += 1
    }
  })
}

function printCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

test('single invoice exposes download and print actions', async ({ page }) => {
  await trackPrint(page)
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerName = `E2E Inv Pdf ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, customerName, '100')
  const today = todayISO()
  await apiCreateLabel(page, supa, customerId, today, 5, 100)
  await apiGenerateInvoice(page, supa, customerId, today, addDays(today, 1), addDays(today, 30))

  await page.goto('/invoice')
  await page.locator('main').getByPlaceholder('Search customer or ID...').fill(customerName)
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10_000 })
  await page.getByText(customerName).first().click()
  await page.waitForURL(/\/invoice\/\d+/, { timeout: 10_000 })

  const invoiceNumber = (await page.locator('h1').first().innerText()).trim()

  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print', exact: true })).toBeVisible()

  // Print renders the A4 sheet and opens the print dialog
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(page.locator('#invoicePrintArea .invoice-sheet')).toHaveCount(1)
  await expect(page.locator('#invoicePrintArea')).toContainText(invoiceNumber)
  expect(await printCalls(page)).toBe(1)

  // Download produces a PDF named after the invoice
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(`invoice-${invoiceNumber}.pdf`)
})

test('bulk export and bulk print from the invoice list', async ({ page }) => {
  await trackPrint(page)
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerName = `E2E Inv Bulk Pdf ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, customerName, '100')
  const today = todayISO()
  await apiCreateLabel(page, supa, customerId, today, 4, 100)
  await apiGenerateInvoice(page, supa, customerId, today, addDays(today, 1), addDays(today, 30))

  await page.goto('/invoice')
  await page.locator('main').getByPlaceholder('Search customer or ID...').fill(customerName)
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10_000 })

  await page.getByLabel('Select all invoices on this page').check()
  await expect(page.getByText('1 selected')).toBeVisible()

  await page.getByRole('button', { name: /Print 1/ }).click()
  await expect(page.locator('#invoicePrintArea .invoice-sheet')).toHaveCount(1)
  expect(await printCalls(page)).toBe(1)

  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
  await page.getByRole('button', { name: 'Export PDF' }).first().click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^invoices-1-\d{4}-\d{2}-\d{2}\.pdf$/)
})
