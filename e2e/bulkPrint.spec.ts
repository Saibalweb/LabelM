import { expect, test, type Page } from '@playwright/test'
import {
  apiCreateCustomer,
  apiCreateLabel,
  apiGenerateInvoice,
  loginCapturing,
} from './helpers'

test.describe.configure({ mode: 'serial' })

// `stubPrint` swallows window.print without firing `afterprint`, which bulk
// print relies on to mark labels printed. Simulate the dialog closing instead.
function autoClosePrint(page: Page) {
  return page.addInitScript(() => {
    window.print = () => {
      setTimeout(() => window.dispatchEvent(new Event('afterprint')), 0)
    }
  })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

test('bulk print marks the selected labels printed', async ({ page }) => {
  await autoClosePrint(page)
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerName = `E2E Bulk ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, customerName, '100')
  const today = todayISO()
  await apiCreateLabel(page, supa, customerId, today, 5, 100)
  await apiCreateLabel(page, supa, customerId, today, 3, 100)

  await page.goto('/')
  await page.getByPlaceholder('Search customer or SL No..').fill(customerName)
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10_000 })

  await page.getByLabel('Select all labels on this page').check()
  await expect(page.getByText('2 selected')).toBeVisible()

  const rpcRequest = page.waitForRequest(
    (req) => req.url().includes('/rest/v1/rpc/mark_labels_printed') && req.method() === 'POST',
    { timeout: 10_000 }
  )
  await page.getByRole('button', { name: /Print 2/ }).click()
  const request = await rpcRequest
  const body = JSON.parse(request.postData() ?? '{}') as { p_ids: number[] }
  expect(body.p_ids).toHaveLength(2)
  await expect(page.getByText(/marked printed/)).toBeVisible()
})

test('billed labels can be selected for export and reprint', async ({ page }) => {
  await autoClosePrint(page)
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerName = `E2E Billed ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, customerName, '100')
  const today = todayISO()
  await apiCreateLabel(page, supa, customerId, today, 5, 100)
  await apiGenerateInvoice(page, supa, customerId, today, addDays(today, 1), addDays(today, 30))

  await page.goto('/')
  await page.getByPlaceholder('Search customer or SL No..').fill(customerName)
  await expect(page.getByText('Billed').first()).toBeVisible({ timeout: 10_000 })

  // The row is billed but still selectable (export/reprint), and a print run
  // reports no status change because the label is already printed.
  const checkbox = page.getByRole('checkbox', { name: /^Select label/ }).first()
  await expect(checkbox).toBeVisible()
  await expect(checkbox).not.toBeDisabled()
  await checkbox.check()
  await expect(page.getByText('1 selected')).toBeVisible()

  const rpcRequest = page.waitForRequest(
    (req) => req.url().includes('/rest/v1/rpc/mark_labels_printed') && req.method() === 'POST',
    { timeout: 10_000 }
  )
  await page.getByRole('button', { name: /Print 1/ }).click()
  await rpcRequest
  await expect(page.getByText('No labels needed a status change')).toBeVisible()
})
