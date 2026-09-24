import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChain, type MockSupabase } from '@/test/supabase-helpers'

const { supabaseMock, setRateMock } = vi.hoisted(() => {
  const supabase = { from: vi.fn(), rpc: vi.fn() } as unknown as MockSupabase
  return { supabaseMock: supabase, setRateMock: vi.fn() }
})

vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock }))
vi.mock('@/services/prices', () => ({
  pricesService: { setRate: setRateMock, getCurrentRate: vi.fn() },
}))

import { customerService } from '@/services/customers'

const priceRows = [
  { effective_from: '2026-01-01', effective_to: '2026-06-01', rate: 30 },
  { effective_from: '2026-06-01', effective_to: null, rate: 42 },
]

function customerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 7,
    name: 'Acme Trading',
    address: 'Addr',
    phone: '123',
    email: 'a@b.c',
    gst_number: 'GST1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    customer_prices: priceRows,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('customerService.list', () => {
  it('resolves currentRate from the open price row', async () => {
    const { query, calls } = createChain(() => ({ data: [customerRow()], error: null }))
    supabaseMock.from.mockReturnValue(query)

    const customers = await customerService.list()

    expect(customers[0].currentRate).toBe(42)
    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['deleted_at', null])
    expect(calls.find((c) => c.method === 'order')?.args).toEqual(['id', { ascending: true }])
  })

  it('falls back to the latest effective_from price when nothing is open', async () => {
    const { query } = createChain(() => ({
      data: [
        customerRow({
          customer_prices: [
            { effective_from: '2026-01-01', effective_to: '2026-06-01', rate: 30 },
            { effective_from: '2026-06-01', effective_to: '2026-09-01', rate: 38 },
          ],
        }),
      ],
      error: null,
    }))
    supabaseMock.from.mockReturnValue(query)

    const customers = await customerService.list()
    expect(customers[0].currentRate).toBe(38)
  })

  it('returns null currentRate when the customer has no price history', async () => {
    const { query } = createChain(() => ({
      data: [customerRow({ customer_prices: [] })],
      error: null,
    }))
    supabaseMock.from.mockReturnValue(query)

    const customers = await customerService.list()
    expect(customers[0].currentRate).toBeNull()
  })

  it('maps every scalar field', async () => {
    const { query } = createChain(() => ({ data: [customerRow()], error: null }))
    supabaseMock.from.mockReturnValue(query)

    const [c] = await customerService.list()
    expect(c).toMatchObject({
      id: 7,
      name: 'Acme Trading',
      address: 'Addr',
      phone: '123',
      email: 'a@b.c',
      gst_number: 'GST1',
    })
  })

  it('throws on error', async () => {
    const { query } = createChain(() => ({ data: null, error: new Error('fail'), }))
    supabaseMock.from.mockReturnValue(query)
    await expect(customerService.list()).rejects.toThrow('fail')
  })
})

describe('customerService.create', () => {
  it('creates the customer then applies a rate when provided', async () => {
    const insert = createChain(() => ({ data: { id: 7 }, error: null }))
    const detail = createChain(() => ({ data: customerRow(), error: null }))
    supabaseMock.from.mockReturnValueOnce(insert.query).mockReturnValueOnce(detail.query)

    const customer = await customerService.create({
      name: 'Acme',
      address: null,
      phone: null,
      email: null,
      gst_number: null,
      rate: 42,
    })

    const insertArgs = insert.calls.find((c) => c.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >
    expect(insertArgs).toEqual({
      name: 'Acme',
      address: null,
      phone: null,
      email: null,
      gst_number: null,
    })
    expect(setRateMock).toHaveBeenCalledWith(7, 42)
    expect(customer.currentRate).toBe(42)
  })

  it('skips setRate when no rate is provided', async () => {
    const insert = createChain(() => ({ data: { id: 8 }, error: null }))
    const detail = createChain(() => ({ data: customerRow({ customer_prices: [] }), error: null }))
    supabaseMock.from.mockReturnValueOnce(insert.query).mockReturnValueOnce(detail.query)

    await customerService.create({
      name: 'No Rate',
      address: null,
      phone: null,
      email: null,
      gst_number: null,
    })
    expect(setRateMock).not.toHaveBeenCalled()
  })
})

describe('customerService.update', () => {
  it('updates only the provided fields', async () => {
    const update = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: customerRow(), error: null }))
    supabaseMock.from.mockReturnValueOnce(update.query).mockReturnValueOnce(detail.query)

    await customerService.update(7, { name: 'Acme Ltd' })

    const updateArgs = update.calls.find((c) => c.method === 'update')?.args[0] as Record<
      string,
      unknown
    >
    expect(updateArgs).toEqual({ name: 'Acme Ltd' })
    expect(setRateMock).not.toHaveBeenCalled()
  })

  it('normalises undefined optional fields to null only when provided', async () => {
    const update = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: customerRow(), error: null }))
    supabaseMock.from.mockReturnValueOnce(update.query).mockReturnValueOnce(detail.query)

    await customerService.update(7, { phone: '' })

    const updateArgs = update.calls.find((c) => c.method === 'update')?.args[0] as Record<
      string,
      unknown
    >
    expect(updateArgs.phone).toBe('')
  })

  it('sets a new rate when the patch includes one', async () => {
    const update = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: customerRow(), error: null }))
    supabaseMock.from.mockReturnValueOnce(update.query).mockReturnValueOnce(detail.query)

    await customerService.update(7, { name: 'Acme', rate: 55 })

    expect(setRateMock).toHaveBeenCalledWith(7, 55)
  })

  it('skips the update call entirely when nothing to update', async () => {
    const detail = createChain(() => ({ data: customerRow(), error: null }))
    supabaseMock.from.mockReturnValue(detail.query)

    await customerService.update(7, {})
    expect(detail.calls.some((c) => c.method === 'update')).toBe(false)
  })
})

describe('customerService.remove / restore', () => {
  it('soft-deletes by setting deleted_at', async () => {
    const { query, calls } = createChain(() => ({ data: null, error: null }))
    supabaseMock.from.mockReturnValue(query)

    await customerService.remove(7)

    const updateArgs = calls.find((c) => c.method === 'update')?.args[0] as Record<string, unknown>
    expect(typeof updateArgs.deleted_at).toBe('string')
    const eqCalls = calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqCalls).toContainEqual(['id', 7])
  })

  it('restores by clearing deleted_at', async () => {
    const { query, calls } = createChain(() => ({ data: null, error: null }))
    supabaseMock.from.mockReturnValue(query)

    await customerService.restore(7)

    const updateArgs = calls.find((c) => c.method === 'update')?.args[0] as Record<string, unknown>
    expect(updateArgs.deleted_at).toBeNull()
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toContainEqual(['id', 7])
  })
})