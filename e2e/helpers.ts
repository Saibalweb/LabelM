import { expect, type Page } from '@playwright/test'
import { envValue } from './fixtures/env'

// Overridable via shell env or the gitignored .env (OWNER_EMAIL / OWNER_PASSWORD).
export const OWNER_EMAIL = envValue('OWNER_EMAIL') || 'saibalkole@gmail.com'
export const OWNER_PASSWORD = envValue('OWNER_PASSWORD') || 'ChangeMe123!'

// Fixed admin/staff accounts for the RBAC matrix (e2e/roles.spec.ts). Unlike the
// owner, these have no fallback — the spec skips when they are unset.
export const ADMIN_EMAIL = envValue('ADMIN_EMAIL')
export const ADMIN_PASSWORD = envValue('ADMIN_PASSWORD')
export const STAFF_EMAIL = envValue('STAFF_EMAIL')
export const STAFF_PASSWORD = envValue('STAFF_PASSWORD')

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
  await page.getByLabel('Rate (₹ per gram)').fill(rate)
  await page.getByRole('button', { name: 'Add Customer' }).click()
  // The list paginates 25/page ordered by ascending id and accumulates E2E rows,
  // so a freshly created customer is rarely on page 1. Search to surface it.
  await page.getByPlaceholder('Search name or ID...').fill(name)
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

// ---------------------------------------------------------------------------
// Supabase REST helpers — deterministic setup that bypasses the flaky two-step
// UI creation (customer insert + price insert). The endpoint and anon key are
// captured from the app's own login traffic, so no env vars are required.
// ---------------------------------------------------------------------------

export interface SupabaseSession {
  origin: string
  anonKey: string
}

export async function loginCapturing(page: Page): Promise<SupabaseSession> {
  let captured: SupabaseSession | null = null
  page.on('request', (req) => {
    if (captured) return
    const url = req.url()
    if (url.includes('/auth/v1/')) {
      const apikey = req.headers()['apikey']
      if (apikey) captured = { origin: new URL(url).origin, anonKey: apikey }
    }
  })
  await login(page)
  if (!captured) throw new Error('failed to capture Supabase endpoint from login traffic')
  return captured
}

async function sessionToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.includes('-auth-token'))
    if (!key) return null
    try {
      return JSON.parse(localStorage.getItem(key) ?? '{}').access_token ?? null
    } catch {
      return null
    }
  })
  if (!token) throw new Error('no session token in localStorage')
  return token
}

export async function apiHeaders(page: Page, supa: SupabaseSession) {
  return {
    apikey: supa.anonKey,
    Authorization: `Bearer ${await sessionToken(page)}`,
    'Content-Type': 'application/json',
  }
}

export async function apiCreateCustomer(
  page: Page,
  supa: SupabaseSession,
  name: string,
  rate: string
): Promise<string> {
  const headers = await apiHeaders(page, supa)
  const res = await page.request.post(`${supa.origin}/rest/v1/customers`, {
    headers: { ...headers, Prefer: 'return=representation' },
    data: { name },
  })
  if (!res.ok()) throw new Error(`customer create failed: ${res.status()} ${await res.text()}`)
  const [customer] = (await res.json()) as { id: number }[]

  const price = await page.request.post(`${supa.origin}/rest/v1/customer_prices`, {
    headers,
    data: {
      customer_id: customer.id,
      rate: Number(rate),
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: null,
    },
  })
  if (!price.ok()) throw new Error(`price create failed: ${price.status()} ${await price.text()}`)
  return String(customer.id)
}

let labelCounter = 0

export async function apiCreateLabel(
  page: Page,
  supa: SupabaseSession,
  customerId: string,
  labelDate: string,
  weight: number,
  rate: number
): Promise<void> {
  const headers = await apiHeaders(page, supa)
  labelCounter += 1
  const res = await page.request.post(`${supa.origin}/rest/v1/labels`, {
    headers,
    data: {
      sl_no: `LBL-E2E-${Date.now().toString(36)}-${labelCounter}`,
      customer_id: Number(customerId),
      label_date: labelDate,
      weight,
      rate,
      amount: Math.round(weight * rate * 100) / 100,
    },
  })
  if (!res.ok()) throw new Error(`label create failed: ${res.status()} ${await res.text()}`)
}

export interface LabelRow {
  id: number
  sl_no: string
  status: 'draft' | 'printed'
  invoice_id: number | null
  label_date: string
}

export async function apiListLabels(
  page: Page,
  supa: SupabaseSession,
  customerId: string
): Promise<LabelRow[]> {
  const headers = await apiHeaders(page, supa)
  const res = await page.request.get(
    `${supa.origin}/rest/v1/labels?customer_id=eq.${customerId}&select=id,sl_no,status,invoice_id,label_date&order=label_date.asc`,
    { headers }
  )
  if (!res.ok()) throw new Error(`label list failed: ${res.status()} ${await res.text()}`)
  return (await res.json()) as LabelRow[]
}

export async function apiMarkLabelsPrinted(
  page: Page,
  supa: SupabaseSession,
  ids: number[]
): Promise<number> {
  const headers = await apiHeaders(page, supa)
  const res = await page.request.post(`${supa.origin}/rest/v1/rpc/mark_labels_printed`, {
    headers,
    data: { p_ids: ids },
  })
  if (!res.ok()) throw new Error(`mark printed failed: ${res.status()} ${await res.text()}`)
  return (await res.json()) as number
}

export async function apiSetLabelStatus(
  page: Page,
  supa: SupabaseSession,
  id: number,
  status: 'draft' | 'printed'
): Promise<void> {
  const headers = await apiHeaders(page, supa)
  const res = await page.request.patch(`${supa.origin}/rest/v1/labels?id=eq.${id}`, {
    headers,
    data: { status },
  })
  if (!res.ok()) throw new Error(`label status patch failed: ${res.status()} ${await res.text()}`)
}

export async function apiGenerateInvoice(
  page: Page,
  supa: SupabaseSession,
  customerId: string,
  periodStart: string,
  periodEnd: string,
  dueDate: string
): Promise<number> {
  const headers = await apiHeaders(page, supa)
  const res = await page.request.post(
    `${supa.origin}/rest/v1/rpc/generate_invoice_for_customer`,
    {
      headers,
      data: {
        p_customer_id: Number(customerId),
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_due_date: dueDate,
      },
    }
  )
  if (!res.ok()) throw new Error(`invoice generate failed: ${res.status()} ${await res.text()}`)
  const rows = (await res.json()) as { invoice_id: number | null }[]
  if (!rows[0]?.invoice_id) throw new Error('invoice generation returned no invoice')
  return rows[0].invoice_id
}