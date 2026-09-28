import { expect, test } from '@playwright/test'
import {
  apiCreateCustomer,
  apiCreateLabel,
  apiGenerateInvoice,
  apiListLabels,
  apiMarkLabelsPrinted,
  apiSetLabelStatus,
  loginCapturing,
} from './helpers'

test.describe.configure({ mode: 'serial' })

// Status-flip matrix for bulk print, exercised against the real
// mark_labels_printed RPC (client tests can only assert the RPC is called):
//
//   label            invoice_id | status before | expected after
//   A unbilled draft  null       | draft         | printed        (flips)
//   B unbilled printed null      | printed       | printed        (no-op)
//   C billed          set        | printed       | printed        (locked, no-op)
test('bulk mark-printed only flips unbilled drafts', async ({ page }) => {
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerId = await apiCreateCustomer(page, supa, `E2E Status ${suffix}`, '100')

  await apiCreateLabel(page, supa, customerId, '2026-01-05', 5, 100) // A
  await apiCreateLabel(page, supa, customerId, '2026-02-05', 5, 100) // B
  await apiCreateLabel(page, supa, customerId, '2026-03-05', 5, 100) // C

  const created = await apiListLabels(page, supa, customerId)
  expect(created).toHaveLength(3)
  const [labelA, labelB, labelC] = created

  // B: unbilled but already printed.
  await apiSetLabelStatus(page, supa, labelB.id, 'printed')

  // C: bill it (generation locks invoice_id and sets status = printed).
  await apiGenerateInvoice(page, supa, customerId, '2026-03-01', '2026-04-01', '2026-04-30')

  const flipped = await apiMarkLabelsPrinted(page, supa, [labelA.id, labelB.id, labelC.id])
  expect(flipped).toBe(1)

  const after = await apiListLabels(page, supa, customerId)
  const byId = new Map(after.map((row) => [row.id, row]))
  expect(byId.get(labelA.id)).toMatchObject({ status: 'printed', invoice_id: null })
  expect(byId.get(labelB.id)).toMatchObject({ status: 'printed', invoice_id: null })
  expect(byId.get(labelC.id)?.status).toBe('printed')
  expect(byId.get(labelC.id)?.invoice_id).not.toBeNull()
})

test('mark-printed is idempotent on a second run', async ({ page }) => {
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerId = await apiCreateCustomer(page, supa, `E2E Idem ${suffix}`, '100')
  await apiCreateLabel(page, supa, customerId, '2026-01-06', 2, 100)
  const [label] = await apiListLabels(page, supa, customerId)

  expect(await apiMarkLabelsPrinted(page, supa, [label.id])).toBe(1)
  expect(await apiMarkLabelsPrinted(page, supa, [label.id])).toBe(0)
})

test('exporting labels does not change their status', async ({ page }) => {
  const supa = await loginCapturing(page)
  const suffix = Date.now().toString(36)
  const customerName = `E2E Export ${suffix}`
  const customerId = await apiCreateCustomer(page, supa, customerName, '100')
  await apiCreateLabel(page, supa, customerId, '2026-01-07', 4, 100)
  const [label] = await apiListLabels(page, supa, customerId)
  expect(label.status).toBe('draft')

  await page.goto('/')
  await page.getByPlaceholder('Search customer or SL No..').fill(customerName)
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10_000 })

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PDF' }).click()
  await download

  const after = await apiListLabels(page, supa, customerId)
  expect(after[0].status).toBe('draft')
  expect(after[0].invoice_id).toBeNull()
})
