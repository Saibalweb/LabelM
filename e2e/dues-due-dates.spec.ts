import { expect, test, type Page } from '@playwright/test'
import {
  apiCreateCustomer,
  apiCreateLabel,
  apiGenerateInvoice,
  loginCapturing,
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

async function openFilters(page: Page) {
  await page.getByRole('button', { name: /Filters/ }).click()
}

async function applyFilters(page: Page) {
  await page.getByRole('button', { name: /Apply Filters/ }).click()
}

test('dues cards + filters reflect generated due dates (real data)', async ({ page }) => {
  stubPrint(page)
  const supa = await loginCapturing(page)

  const cust = `E2E Dues Due ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, cust, '100')

  const today = todayISO()
  // Three invoices: one genuinely overdue, one due in 3 days, one due in 45.
  // Each label is ₹100 (weight 1 × rate 100) so the customer total is ₹300.
  const scenarios = [
    { month: '2026-03', from: '2026-03-01', to: '2026-04-01', due: addDaysISO(today, -40) },
    { month: '2026-04', from: '2026-04-01', to: '2026-05-01', due: addDaysISO(today, 3) },
    { month: '2026-05', from: '2026-05-01', to: '2026-06-01', due: addDaysISO(today, 45) },
  ]
  for (const s of scenarios) {
    await apiCreateLabel(page, supa, customerId, `${s.month}-15`, 1, 100)
    await apiGenerateInvoice(page, supa, customerId, s.from, s.to, s.due)
  }

  await page.goto('/dues')

  // Scope server-side to this customer via search, so the stat cards are deterministic.
  await page.getByPlaceholder('Search customer or invoice...').first().fill(cust)
  const row = page.getByRole('main').getByText(cust).first()
  await expect(row).toBeVisible({ timeout: 10_000 })

  // --- Three overview cards (scoped to the searched customer) ---
  await expect(page.getByTestId('stat-total-outstanding')).toHaveText('₹300')
  await expect(page.getByTestId('stat-customers-with-dues')).toHaveText('1')
  // Oldest due is measured from today, not from the newest due date in the set.
  await expect(page.getByTestId('stat-oldest-due')).toHaveText('40 days')
  await expect(page.getByText('1 currently overdue')).toBeVisible()
  await expect(page.getByRole('main').getByText('₹300.00').first()).toBeVisible()

  // --- Quick-view presets (client-side, today-based) ---
  await page.getByRole('button', { name: 'Overdue', exact: true }).click()
  await expect(row).toBeVisible()
  await page.getByRole('button', { name: 'Due Soon', exact: true }).click()
  await expect(row).toBeVisible()
  await page.getByRole('button', { name: 'Due 30+ Days', exact: true }).click()
  await expect(row).toBeVisible()
  await page.getByRole('button', { name: 'Due 30+ Days', exact: true }).click() // back to All Dues

  // --- Aging (client-side): oldest is 40 days → 31–60 matches, 1–30 does not ---
  await openFilters(page)
  await page.getByLabel('Overdue 31–60 days').check()
  await applyFilters(page)
  await expect(row).toBeVisible()

  await openFilters(page)
  await page.getByLabel('Overdue 31–60 days').uncheck()
  await page.getByLabel('Overdue 1–30 days').check()
  await applyFilters(page)
  await expect(page.getByText('No customers match your search or filters.')).toBeVisible()

  // --- Due Date Window = Overdue (server-side) keeps only the overdue invoice ---
  await openFilters(page)
  await page.getByLabel('Overdue 1–30 days').uncheck()
  const windowGrid = page
    .getByRole('dialog')
    .locator('div.grid.grid-cols-3')
    .filter({ has: page.getByRole('button', { name: 'All Time' }) })
  await windowGrid.getByRole('button', { name: 'Overdue', exact: true }).click()
  await applyFilters(page)
  await expect(row).toBeVisible()
  await expect(page.getByTestId('stat-total-outstanding')).toHaveText('₹100')
  await expect(page.getByTestId('stat-oldest-due')).toHaveText('40 days')
})
