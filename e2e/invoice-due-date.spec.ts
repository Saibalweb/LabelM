import { expect, test, type Page } from '@playwright/test'
import {
  apiCreateCustomer,
  apiHeaders,
  loginCapturing,
  selectCustomerById,
  stubPrint,
} from './helpers'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString(36)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

// Mirrors src/lib/format.ts formatDate (en-IN, day/month-short/year).
function fmt(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

async function addLabelInMonth(page: Page, customerId: string, month: string) {
  await page.goto('/create')
  await selectCustomerById(page, customerId)
  await page.locator('input[type="date"]').fill(`${month}-15`)
  await page.getByPlaceholder('0.00').fill('1')
  await page.getByRole('button', { name: 'Generate Label' }).click()
  await page.waitForURL(/\/preview\/\d+/)
}

async function generateForMonth(
  page: Page,
  customerName: string,
  month: string,
  term: 'on-receipt' | 'net15' | 'net30' | 'custom',
  customDate?: string
) {
  await page.goto('/invoice/new')
  await page.getByPlaceholder('Search customer by name or ID...').fill(customerName)
  await page.getByRole('button', { name: new RegExp(customerName) }).first().click()
  await page.locator('input[type="month"]').fill(month)
  await expect(page.getByText('1 of 1 labels selected')).toBeVisible({ timeout: 10_000 })

  if (term !== 'net30') {
    const label = term === 'on-receipt' ? 'On Receipt' : term === 'net15' ? 'Net 15' : 'Custom'
    await page.getByRole('button', { name: label, exact: true }).click()
  }
  if (term === 'custom' && customDate) {
    await page.locator('input[type="date"]').fill(customDate)
  }

  await page.getByRole('button', { name: 'Generate Invoice' }).click()
  await page.waitForURL(/\/invoice\/\d+/, { timeout: 15_000 })
}

function dueDateValue(page: Page) {
  return page.getByText('Due Date:', { exact: true }).locator('xpath=following-sibling::span[1]')
}

test('single wizard: each payment term writes the expected due date', async ({ page }) => {
  stubPrint(page)
  const supa = await loginCapturing(page)

  const cust = `E2E Due ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, cust, '100')

  const today = todayISO()
  const net30 = addDaysISO(today, 30)
  const net15 = addDaysISO(today, 15)
  const customFuture = addDaysISO(today, 90)
  const customPast = addDaysISO(today, -30)

  // One unbilled label per month so each period can be invoiced once.
  const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07']
  for (const m of months) {
    await addLabelInMonth(page, customerId, m)
  }

  const cases: {
    month: string
    term: 'on-receipt' | 'net15' | 'net30' | 'custom'
    custom?: string
    expected: string
  }[] = [
    { month: '2026-03', term: 'net30', expected: net30 },
    { month: '2026-04', term: 'net15', expected: net15 },
    { month: '2026-05', term: 'on-receipt', expected: today },
    { month: '2026-06', term: 'custom', custom: customFuture, expected: customFuture },
    { month: '2026-07', term: 'custom', custom: customPast, expected: customPast },
  ]

  for (const c of cases) {
    await generateForMonth(page, cust, c.month, c.term, c.custom)
    await expect(page.getByText('Unpaid', { exact: true })).toBeVisible()
    await expect(dueDateValue(page)).toHaveText(fmt(c.expected))
  }

  // The custom-past invoice must surface under the Overdue pill.
  await page.goto('/invoice')
  await page.getByRole('button', { name: 'Overdue', exact: true }).click()
  await expect(page.getByText(cust).first()).toBeVisible({ timeout: 10_000 })
})

test('single wizard: confirm panel previews the selected due date before generating', async ({ page }) => {
  stubPrint(page)
  const supa = await loginCapturing(page)

  const cust = `E2E Due Preview ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, cust, '100')
  await addLabelInMonth(page, customerId, '2026-03')

  const expected = addDaysISO(todayISO(), 15)

  await page.goto('/invoice/new')
  await page.getByPlaceholder('Search customer by name or ID...').fill(cust)
  await page.getByRole('button', { name: new RegExp(cust) }).first().click()
  await page.locator('input[type="month"]').fill('2026-03')
  await expect(page.getByText('1 of 1 labels selected')).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Net 15', exact: true }).click()
  await expect(page.getByText(`Due ${fmt(expected)}`).first()).toBeVisible()
})

test('bulk: custom due date applies to every generated invoice', async ({ page }) => {
  stubPrint(page)
  const supa = await loginCapturing(page)

  const cust = `E2E Due Bulk ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, cust, '100')
  await addLabelInMonth(page, customerId, '2026-02')

  const customDue = addDaysISO(todayISO(), 45)

  await page.goto('/invoice')
  await page.getByRole('button', { name: /Generate for All/ }).click()
  const bulkDialog = page.getByRole('dialog')

  await bulkDialog.getByRole('button', { name: 'Custom Range' }).click()
  await bulkDialog.locator('input[type="date"]').nth(0).fill('2026-02-01')
  await bulkDialog.locator('input[type="date"]').nth(1).fill('2026-03-01')

  // Payment terms: pick Custom (adds a third date input after From/To).
  await bulkDialog.getByRole('button', { name: 'Custom', exact: true }).click()
  await bulkDialog.locator('input[type="date"]').nth(2).fill(customDue)

  await bulkDialog.getByRole('button', { name: 'Preview' }).click()
  await expect(bulkDialog.getByText(cust)).toBeVisible({ timeout: 10_000 })
  await bulkDialog.getByRole('button', { name: /Generate \d+ invoices/ }).click()
  await expect(bulkDialog.getByText(/Created — \d+/)).toBeVisible({ timeout: 20_000 })

  await bulkDialog.getByRole('row', { name: new RegExp(cust) }).click()
  await page.waitForURL(/\/invoice\/\d+/, { timeout: 15_000 })
  await expect(dueDateValue(page)).toHaveText(fmt(customDue))
})

test('rpc fallback: null p_due_date stores current_date + 30', async ({ page }) => {
  stubPrint(page)
  const supa = await loginCapturing(page)

  const cust = `E2E Due Fallback ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, cust, '100')
  await addLabelInMonth(page, customerId, '2026-01')

  const headers = await apiHeaders(page, supa)

  const res = await page.request.post(`${supa.origin}/rest/v1/rpc/generate_invoice_for_customer`, {
    headers,
    data: {
      p_customer_id: Number(customerId),
      p_period_start: '2026-01-01',
      p_period_end: '2026-02-01',
      p_due_date: null,
    },
  })
  expect(res.ok()).toBeTruthy()
  const rows = (await res.json()) as { invoice_id: number | null }[]
  expect(rows[0]?.invoice_id).toBeTruthy()

  const read = await page.request.get(
    `${supa.origin}/rest/v1/invoices?id=eq.${rows[0].invoice_id}&select=due_date`,
    { headers }
  )
  const [invoice] = (await read.json()) as { due_date: string }[]

  // Server current_date is UTC; allow a +/- 1 day boundary against local today.
  const candidates = [
    addDaysISO(todayISO(), 29),
    addDaysISO(todayISO(), 30),
    addDaysISO(todayISO(), 31),
  ]
  expect(candidates).toContain(invoice.due_date)
})
