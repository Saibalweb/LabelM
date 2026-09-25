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

describe('customerService.search', () => {
  it('returns an empty list for a blank query without hitting the server', async () => {
    const customers = await customerService.search('   ')
    expect(customers).toEqual([])
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('matches numeric queries against the id prefix via integer ranges', async () => {
    const { query, calls } = createChain(() => ({ data: [customerRow()], error: null }))
    supabaseMock.from.mockReturnValue(query)

    await customerService.search('12')

    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['deleted_at', null])
    expect(calls.find((c) => c.method === 'ilike')).toBeUndefined()
    const orCondition = calls.find((c) => c.method === 'or')?.args[0] as string
    expect(orCondition).toBe(
      [
        'and(id.gte.12,id.lt.13)',
        'and(id.gte.120,id.lt.130)',
        'and(id.gte.1200,id.lt.1300)',
        'and(id.gte.12000,id.lt.13000)',
        'and(id.gte.120000,id.lt.130000)',
        'and(id.gte.1200000,id.lt.1300000)',
        'and(id.gte.12000000,id.lt.13000000)',
        'and(id.gte.120000000,id.lt.130000000)',
        'and(id.gte.1200000000,id.lt.1300000000)',
      ].join(',')
    )
    expect(calls.find((c) => c.method === 'limit')?.args).toEqual([25])
  })

  it('returns an empty list for numeric queries with no possible ranges', async () => {
    const customers = await customerService.search('99999999999999999999')
    expect(customers).toEqual([])
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('matches name queries with a case-insensitive contains', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null }))
    supabaseMock.from.mockReturnValue(query)

    await customerService.search('Acme')

    expect(calls.find((c) => c.method === 'ilike')?.args).toEqual(['name', '%Acme%'])
  })

  it('maps result rows to customers with currentRate', async () => {
    const { query } = createChain(() => ({ data: [customerRow()], error: null }))
    supabaseMock.from.mockReturnValue(query)

    const customers = await customerService.search('Acme')
    expect(customers[0].name).toBe('Acme Trading')
    expect(customers[0].currentRate).toBe(42)
  })

  it('throws on error', async () => {
    const { query } = createChain(() => ({ data: null, error: new Error('fail') }))
    supabaseMock.from.mockReturnValue(query)

    await expect(customerService.search('Acme')).rejects.toThrow('fail')
  })

  it('clamps the final range to INT4_MAX when the exclusive upper bound would overflow', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null }))
    supabaseMock.from.mockReturnValue(query)

    await customerService.search('2')

    const orCondition = calls.find((c) => c.method === 'or')?.args[0] as string
    expect(orCondition).toBe(
      [
        'and(id.gte.2,id.lt.3)',
        'and(id.gte.20,id.lt.30)',
        'and(id.gte.200,id.lt.300)',
        'and(id.gte.2000,id.lt.3000)',
        'and(id.gte.20000,id.lt.30000)',
        'and(id.gte.200000,id.lt.300000)',
        'and(id.gte.2000000,id.lt.3000000)',
        'and(id.gte.20000000,id.lt.30000000)',
        'and(id.gte.200000000,id.lt.300000000)',
        'and(id.gte.2000000000,id.lte.2147483647)',
      ].join(',')
    )
  })

  it('never emits a literal outside the int4 range for prefixes 1..200', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null }))
    supabaseMock.from.mockReturnValue(query)

    for (let i = 1; i <= 200; i++) {
      calls.length = 0
      await customerService.search(String(i))
      const orCondition = calls.find((c) => c.method === 'or')?.args[0] as string
      const literals = orCondition.match(/\d+/g)?.map(Number) ?? []
      expect(literals.length).toBeGreaterThan(0)
      for (const literal of literals) {
        expect(literal).toBeGreaterThanOrEqual(0)
        expect(literal).toBeLessThanOrEqual(2_147_483_647)
      }
    }
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
  it('soft-deletes via the soft_delete_customer RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null })

    await customerService.remove(7)

    expect(supabaseMock.rpc).toHaveBeenCalledWith('soft_delete_customer', {
      p_customer_id: 7,
    })
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