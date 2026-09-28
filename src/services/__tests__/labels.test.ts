import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChain, type ChainCall, type MockSupabase } from '@/test/supabase-helpers'

const { supabaseMock } = vi.hoisted(() => {
  const supabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  } as unknown as MockSupabase
  return { supabaseMock: supabase }
})

vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock }))

import { labelService } from '@/services/labels'

const labelRow = {
  id: 1,
  sl_no: 'LBL-0001',
  customer_id: 5,
  label_date: '2026-09-24',
  weight: 12.5,
  rate: 42,
  amount: 525,
  status: 'draft',
  invoice_id: null,
  created_at: '2026-09-24T10:00:00Z',
  customers: { name: 'Acme Trading' },
}

function filterCalls(calls: ChainCall[], method: string): unknown[][] {
  return calls.filter((c) => c.method === method).map((c) => c.args)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('labelService.list', () => {
  it('applies default pagination and newest sort with an id tiebreak', async () => {
    const { query, calls } = createChain(() => ({ data: [labelRow], error: null, count: 1 }))
    supabaseMock.from.mockReturnValue(query)

    const result = await labelService.list({}, { page: 1, pageSize: 25, sortBy: 'newest' })

    expect(supabaseMock.from).toHaveBeenCalledWith('labels')
    expect(calls.find((c) => c.method === 'select')?.args[0]).toContain('sl_no')
    expect(filterCalls(calls, 'order')).toEqual([
      ['label_date', { ascending: false }],
      ['id', { ascending: false }],
    ])
    expect(filterCalls(calls, 'range')).toEqual([[0, 24]])
    expect(result.total).toBe(1)
    expect(result.data[0]).toEqual({
      id: 1,
      slNo: 'LBL-0001',
      customerId: 5,
      customerName: 'Acme Trading',
      date: '2026-09-24',
      weight: 12.5,
      rate: 42,
      amount: 525,
      status: 'draft',
      invoiceId: null,
      createdAt: '2026-09-24T10:00:00Z',
    })
  })

  it('computes a page-3 range from pageSize', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null, count: 0 }))
    supabaseMock.from.mockReturnValue(query)

    await labelService.list({}, { page: 3, pageSize: 50, sortBy: 'oldest' })

    expect(filterCalls(calls, 'range')).toEqual([[100, 149]])
    expect(filterCalls(calls, 'order')[0]).toEqual(['label_date', { ascending: true }])
  })

  it('maps an array customer embed the same as a single object', async () => {
    const { query } = createChain(() => ({
      data: [{ ...labelRow, customers: [{ name: 'Bulk Co.' }] }],
      error: null,
      count: 1,
    }))
    supabaseMock.from.mockReturnValue(query)
    const result = await labelService.list({})
    expect(result.data[0].customerName).toBe('Bulk Co.')
  })

  it('falls back to null customer name when no embed is present', async () => {
    const { query } = createChain(() => ({
      data: [{ ...labelRow, customers: null }],
      error: null,
      count: 1,
    }))
    supabaseMock.from.mockReturnValue(query)
    const result = await labelService.list({})
    expect(result.data[0].customerName).toBeNull()
  })

  it('throws when the query errors', async () => {
    const { query } = createChain(() => ({ data: null, error: new Error('boom'), count: 0 }))
    supabaseMock.from.mockReturnValue(query)
    await expect(labelService.list({})).rejects.toThrow('boom')
  })
})

describe('labelService.list — filter mapping', () => {
  async function capture(filters = {}, customers: Array<{ id: number }> = []) {
    const customerChain = createChain(() => ({ data: customers, error: null }))
    const labelsChain = createChain(() => ({ data: [], error: null, count: 0 }))
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'customers' ? customerChain.query : labelsChain.query
    )
    await labelService.list(filters)
    return labelsChain.calls
  }

  it('maps a search query to sl_no ilike plus matching customer ids', async () => {
    const calls = await capture({ query: '  Acme  ' }, [{ id: 3 }, { id: 5 }])
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe(
      'sl_no.ilike.%Acme%,customer_id.in.(3,5)'
    )
  })

  it('keeps only the sl_no condition when no customer matches', async () => {
    const calls = await capture({ query: 'Acme' }, [])
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe('sl_no.ilike.%Acme%')
  })

  it('sanitises characters that break the PostgREST or() tree', async () => {
    const calls = await capture({ query: 'a,b(c)"d' }, [])
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe('sl_no.ilike.%a b c d%')
  })

  it('ignores a blank query string without hitting the customers table', async () => {
    const calls = await capture({ query: '   ' }, [])
    expect(calls.some((c) => c.method === 'or')).toBe(false)
  })

  it('maps customer ids, statuses and billing filters', async () => {
    const calls = await capture({
      customerIds: [1, 2],
      statuses: ['draft', 'printed'],
      billing: ['billed', 'unbilled'],
    })
    expect(calls.find((c) => c.method === 'in')?.args).toEqual(['customer_id', [1, 2]])
    expect(calls.filter((c) => c.method === 'in').map((c) => c.args)).toContainEqual([
      'status',
      ['draft', 'printed'],
    ])
  })

  it('maps billed-only to invoice_id is not null', async () => {
    const calls = await capture({ billing: ['billed'] })
    expect(calls.find((c) => c.method === 'not')?.args).toEqual(['invoice_id', 'is', null])
    expect(calls.some((c) => c.method === 'is')).toBe(false)
  })

  it('maps unbilled-only to invoice_id is null', async () => {
    const calls = await capture({ billing: ['unbilled'] })
    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['invoice_id', null])
  })

  it('maps weight and amount ranges', async () => {
    const calls = await capture({
      minWeight: 5,
      maxWeight: 20,
      minAmount: 100,
      maxAmount: 1000,
    })
    expect(calls.find((c) => c.method === 'gte' && c.args[0] === 'weight')?.args).toEqual([
      'weight',
      5,
    ])
    expect(calls.find((c) => c.method === 'lte' && c.args[0] === 'weight')?.args).toEqual([
      'weight',
      20,
    ])
    expect(calls.find((c) => c.method === 'gte' && c.args[0] === 'amount')?.args).toEqual([
      'amount',
      100,
    ])
    expect(calls.find((c) => c.method === 'lte' && c.args[0] === 'amount')?.args).toEqual([
      'amount',
      1000,
    ])
  })

  it('maps half-open date range', async () => {
    const calls = await capture({ from: '2026-09-01', to: '2026-10-01' })
    expect(calls.find((c) => c.method === 'gte' && c.args[0] === 'label_date')?.args).toEqual([
      'label_date',
      '2026-09-01',
    ])
    expect(calls.find((c) => c.method === 'lt' && c.args[0] === 'label_date')?.args).toEqual([
      'label_date',
      '2026-10-01',
    ])
  })

  it('maps the customer-asc sort with a stable id tiebreak', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null, count: 0 }))
    supabaseMock.from.mockReturnValue(query)
    await labelService.list({}, { page: 1, pageSize: 25, sortBy: 'customer-asc' })
    expect(filterCalls(calls, 'order')).toEqual([
      ['customers(name)', { ascending: true }],
      ['id', { ascending: false }],
    ])
  })
})

describe('labelService.create', () => {
  it('reserves a document number and inserts with a rounded amount', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'LBL-0007', error: null })
    const { query, calls } = createChain(() => ({ data: labelRow, error: null }))
    supabaseMock.from.mockReturnValue(query)

    await labelService.create({ customerId: 5, date: '2026-09-24', weight: 12.5, rate: 42 })

    expect(supabaseMock.rpc).toHaveBeenCalledWith('next_document_number', {
      p_kind: 'label',
      p_prefix: 'LBL',
      p_digits: 4,
    })
    const insertArgs = calls.find((c) => c.method === 'insert')?.args[0] as Record<string, unknown>
    expect(insertArgs).toMatchObject({
      sl_no: 'LBL-0007',
      customer_id: 5,
      label_date: '2026-09-24',
      weight: 12.5,
      rate: 42,
      amount: 525,
      status: 'draft',
    })
    expect(calls.find((c) => c.method === 'single')).toBeDefined()
  })

  it('rounds half values up to 2 decimals (half-up)', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'LBL-0008', error: null })
    const { query, calls } = createChain(() => ({ data: labelRow, error: null }))
    supabaseMock.from.mockReturnValue(query)

    await labelService.create({ customerId: 5, date: '2026-09-24', weight: 0.335, rate: 3 })

    const insertArgs = calls.find((c) => c.method === 'insert')?.args[0] as Record<string, unknown>
    expect(insertArgs.amount).toBe(1.01)
  })

  it('propagates a sl-no reservation error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: new Error('seq locked') })
    await expect(
      labelService.create({ customerId: 1, date: '2026-09-24', weight: 1, rate: 1 })
    ).rejects.toThrow('seq locked')
  })
})

describe('labelService.update', () => {
  it('recomputes the amount when only the weight changes', async () => {
    const rateLookup = createChain(() => ({ data: labelRow, error: null }))
    const update = createChain(() => ({ data: null, error: null }))
    const refetch = createChain(() => ({ data: { ...labelRow, weight: 10, amount: 420 }, error: null }))
    supabaseMock.from
      .mockReturnValueOnce(rateLookup.query)
      .mockReturnValueOnce(update.query)
      .mockReturnValueOnce(refetch.query)

    const result = await labelService.update(1, { weight: 10 })

    const updateArgs = update.calls.find((c) => c.method === 'update')?.args[0] as Record<
      string,
      unknown
    >
    expect(updateArgs).toEqual({ weight: 10, amount: 420 })
    expect(result?.amount).toBe(420)
  })

  it('recomputes the amount when only the rate changes', async () => {
    const weightLookup = createChain(() => ({ data: labelRow, error: null }))
    const update = createChain(() => ({ data: null, error: null }))
    const refetch = createChain(() => ({ data: { ...labelRow, rate: 50, amount: 625 }, error: null }))
    supabaseMock.from
      .mockReturnValueOnce(weightLookup.query)
      .mockReturnValueOnce(update.query)
      .mockReturnValueOnce(refetch.query)

    const result = await labelService.update(1, { rate: 50 })

    const updateArgs = update.calls.find((c) => c.method === 'update')?.args[0] as Record<
      string,
      unknown
    >
    expect(updateArgs).toEqual({ rate: 50, amount: 625 })
    expect(result?.amount).toBe(625)
  })

  it('updates status only for a status patch', async () => {
    const update = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: { ...labelRow, status: 'printed' }, error: null }))
    supabaseMock.from
      .mockReturnValueOnce(update.query)
      .mockReturnValueOnce(detail.query)

    await labelService.update(1, { status: 'printed' })

    const updateArgs = update.calls.find((c) => c.method === 'update')?.args[0] as Record<
      string,
      unknown
    >
    expect(updateArgs).toEqual({ status: 'printed' })
    expect(update.calls.find((c) => c.method === 'eq')?.args).toEqual(['id', 1])
  })

  it('skips a DB update when the patch is empty and still refetches', async () => {
    const detail = createChain(() => ({ data: labelRow, error: null }))
    supabaseMock.from.mockReturnValue(detail.query)

    const result = await labelService.update(1, {})
    expect(result).not.toBeNull()
    expect(detail.calls.some((c) => c.method === 'update')).toBe(false)
  })
})

describe('labelService.remove / stats / counts', () => {
  it('deletes by id', async () => {
    const { query, calls } = createChain(() => ({ data: null, error: null }))
    supabaseMock.from.mockReturnValue(query)
    await labelService.remove(42)
    expect(calls.find((c) => c.method === 'delete')).toBeDefined()
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['id', 42])
  })

  it('maps label_stats rpc output', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          total_labels: 10,
          total_weight: '125.5',
          min_weight: 0.5,
          max_weight: 50,
          min_amount: 10,
          max_amount: 2000,
          print_queue: 3,
        },
      ],
      error: null,
    })
    const stats = await labelService.stats()
    expect(stats).toEqual({
      totalLabels: 10,
      totalWeight: 125.5,
      minWeight: 0.5,
      maxWeight: 50,
      minAmount: 10,
      maxAmount: 2000,
      printQueue: 3,
    })
  })

  it('defaults label_stats fields to zero', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null })
    const stats = await labelService.stats()
    expect(stats).toEqual({
      totalLabels: 0,
      totalWeight: 0,
      minWeight: 0,
      maxWeight: 0,
      minAmount: 0,
      maxAmount: 0,
      printQueue: 0,
    })
  })

  it('maps label_counts_by_customer rpc output', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        { customer_id: 1, label_count: 5 },
        { customer_id: 2, label_count: 0 },
      ],
      error: null,
    })
    const counts = await labelService.countsByCustomer()
    expect(counts).toEqual([
      { customerId: 1, count: 5 },
      { customerId: 2, count: 0 },
    ])
  })
})

describe('labelService.listUnbilled', () => {
  it('filters unbilled labels within a half-open range and orders by date then id', async () => {
    const { query, calls } = createChain(() => ({ data: [labelRow], error: null }))
    supabaseMock.from.mockReturnValue(query)

    const rows = await labelService.listUnbilled({ from: '2026-09-01', to: '2026-10-01' })

    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['invoice_id', null])
    expect(filterCalls(calls, 'order')).toEqual([
      ['label_date', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(calls.find((c) => c.method === 'gte')?.args).toEqual(['label_date', '2026-09-01'])
    expect(calls.find((c) => c.method === 'lt')?.args).toEqual(['label_date', '2026-10-01'])
    expect(rows).toHaveLength(1)
  })

  it('scopes to a single customer when requested', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null }))
    supabaseMock.from.mockReturnValue(query)
    await labelService.listUnbilled({ from: 'a', to: 'b', customerId: 9 })
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['customer_id', 9])
  })
})

describe('labelService.listAll', () => {
  it('orders without a range and maps rows', async () => {
    const { query, calls } = createChain(() => ({ data: [labelRow], error: null }))
    supabaseMock.from.mockReturnValue(query)

    const rows = await labelService.listAll({}, 'newest')

    expect(calls.some((c) => c.method === 'range')).toBe(false)
    expect(filterCalls(calls, 'order')).toEqual([
      ['label_date', { ascending: false }],
      ['id', { ascending: false }],
    ])
    expect(rows[0].slNo).toBe('LBL-0001')
  })
})

describe('labelService.markPrinted', () => {
  it('calls the rpc with p_ids and returns the affected count', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 2, error: null })
    const count = await labelService.markPrinted([1, 2])
    expect(supabaseMock.rpc).toHaveBeenCalledWith('mark_labels_printed', { p_ids: [1, 2] })
    expect(count).toBe(2)
  })

  it('skips the rpc for an empty id list', async () => {
    const count = await labelService.markPrinted([])
    expect(count).toBe(0)
    expect(supabaseMock.rpc).not.toHaveBeenCalled()
  })

  it('propagates an rpc error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: new Error('not authorized') })
    await expect(labelService.markPrinted([1])).rejects.toThrow('not authorized')
  })
})