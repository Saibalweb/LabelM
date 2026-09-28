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

import { invoiceService } from '@/services/invoices'

const paymentRows = [
  { id: 2, amount: 500, payment_date: '2026-09-20', payment_mode: 'upi', notes: 'first' },
  { id: 1, amount: 200, payment_date: '2026-09-10', payment_mode: 'cash', notes: null },
]

const labelRows = [
  { id: 3, sl_no: 'LBL-003', label_date: '2026-09-15', weight: 10, rate: 40, amount: 400 },
  { id: 1, sl_no: 'LBL-001', label_date: '2026-09-15', weight: 5, rate: 40, amount: 200 },
  { id: 2, sl_no: 'LBL-002', label_date: '2026-09-10', weight: 7.5, rate: 40, amount: 300 },
]

const invoiceRow = {
  id: 11,
  invoice_number: 'INV-0011',
  customer_id: 5,
  period_start: '2026-09-01',
  period_end: '2026-10-01',
  total_amount: 900,
  total_weight: 22.5,
  status: 'Partial',
  due_date: '2026-10-31',
  created_at: '2026-09-24T10:00:00Z',
  customers: { name: 'Acme Trading', address: 'Addr', email: 'a@b.c', phone: '123' },
  labels: labelRows,
  invoice_payments: paymentRows,
}

function filterCalls(calls: ChainCall[], method: string): unknown[][] {
  return calls.filter((c) => c.method === method).map((c) => c.args)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('invoiceService.listPage', () => {
  it('maps rows to invoices, computes paid/due and sorts line items by date then id', async () => {
    const { query } = createChain(() => ({ data: [invoiceRow], error: null, count: 1 }))
    supabaseMock.from.mockReturnValue(query)

    const result = await invoiceService.listPage({}, { page: 1, pageSize: 25, sortBy: 'newest' })

    const inv = result.data[0]
    expect(inv.id).toBe(11)
    expect(inv.invoiceNumber).toBe('INV-0011')
    expect(inv.customerName).toBe('Acme Trading')
    expect(inv.paid).toBe(700)
    expect(inv.due).toBe(200)
    expect(inv.status).toBe('Partial')
    expect(inv.billingPeriod).toBe('Sep 2026')
    expect(inv.period).toBe('Sep 1, 2026 - Sep 30, 2026')
    expect(inv.dueDate).toBe('2026-10-31')

    expect(inv.lineItems.map((l) => l.id)).toEqual([2, 1, 3])
    expect(inv.payments.map((p) => p.id)).toEqual([1, 2])
    expect(inv.payments[0].receivedBy).toBeNull()
    expect(inv.payments[0].mode).toBe('cash')
  })

  it('uses a fallback customer name when the embed is missing', async () => {
    const { query } = createChain(() => ({
      data: [{ ...invoiceRow, customers: null }],
      error: null,
      count: 1,
    }))
    supabaseMock.from.mockReturnValue(query)
    const result = await invoiceService.listPage({})
    expect(result.data[0].customerName).toBe('Unknown customer')
  })

  it('never reports a negative due amount (overpay clamp)', async () => {
    const { query } = createChain(() => ({
      data: [
        {
          ...invoiceRow,
          total_amount: 500,
          invoice_payments: [{ id: 1, amount: 900, payment_date: '2026-09-20', payment_mode: 'cash', notes: null }],
        },
      ],
      error: null,
      count: 1,
    }))
    supabaseMock.from.mockReturnValue(query)
    const result = await invoiceService.listPage({})
    expect(result.data[0].paid).toBe(900)
    expect(result.data[0].due).toBe(0)
  })

  it('maps a single customer object or an array embed', async () => {
    const { query } = createChain(() => ({
      data: [{ ...invoiceRow, customers: [{ name: 'Array Co.', address: null, email: null, phone: null }] }],
      error: null,
      count: 1,
    }))
    supabaseMock.from.mockReturnValue(query)
    const result = await invoiceService.listPage({})
    expect(result.data[0].customerName).toBe('Array Co.')
  })

  it('applies range pagination and default sort', async () => {
    const { query, calls } = createChain(() => ({ data: [], error: null, count: 0 }))
    supabaseMock.from.mockReturnValue(query)
    await invoiceService.listPage({}, { page: 2, pageSize: 10, sortBy: 'amount-desc' })
    expect(filterCalls(calls, 'range')).toEqual([[10, 19]])
    expect(filterCalls(calls, 'order')[0]).toEqual(['total_amount', { ascending: false }])
  })

  it('throws when the query errors', async () => {
    const { query } = createChain(() => ({ data: null, error: new Error('nope'), count: 0 }))
    supabaseMock.from.mockReturnValue(query)
    await expect(invoiceService.listPage({})).rejects.toThrow('nope')
  })
})

describe('invoiceService.listPage — filter mapping', () => {
  async function capture(filters = {}, customers: Array<{ id: number }> = []) {
    const customerChain = createChain(() => ({ data: customers, error: null }))
    const invoicesChain = createChain(() => ({ data: [], error: null, count: 0 }))
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'customers' ? customerChain.query : invoicesChain.query
    )
    await invoiceService.listPage(filters, {})
    return invoicesChain.calls
  }

  it('maps search to invoice_number ilike plus matching customer ids', async () => {
    const calls = await capture({ query: 'inv-1' }, [{ id: 2 }])
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe(
      'invoice_number.ilike.%inv-1%,customer_id.in.(2)'
    )
  })

  it('keeps only the invoice_number condition when no customer matches', async () => {
    const calls = await capture({ query: 'inv-1' }, [])
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe('invoice_number.ilike.%inv-1%')
  })

  it('maps status, customer, amount and half-open period filters', async () => {
    const calls = await capture({
      statuses: ['Unpaid', 'Partial'],
      customerIds: [1, 2],
      minAmount: 50,
      maxAmount: 500,
      from: '2026-08-01',
      to: '2026-09-01',
    })
    const ins = filterCalls(calls, 'in')
    expect(ins).toContainEqual(['status', ['Unpaid', 'Partial']])
    expect(ins).toContainEqual(['customer_id', [1, 2]])
    expect(calls.find((c) => c.method === 'gte' && c.args[0] === 'total_amount')?.args).toEqual([
      'total_amount',
      50,
    ])
    expect(calls.find((c) => c.method === 'lte' && c.args[0] === 'total_amount')?.args).toEqual([
      'total_amount',
      500,
    ])
    expect(calls.find((c) => c.method === 'gte' && c.args[0] === 'period_start')?.args).toEqual([
      'period_start',
      '2026-08-01',
    ])
    expect(calls.find((c) => c.method === 'lt' && c.args[0] === 'period_start')?.args).toEqual([
      'period_start',
      '2026-09-01',
    ])
  })

  it('maps the overdue flag to unpaid/partial with a past due date', async () => {
    const calls = await capture({ overdue: true })
    expect(filterCalls(calls, 'in')).toContainEqual(['status', ['Unpaid', 'Partial']])
    expect(calls.find((c) => c.method === 'lt')?.args).toEqual(['due_date', todayISO()])
  })

  it('does not apply the overdue filter when disabled', async () => {
    const calls = await capture({ overdue: false })
    expect(calls.find((c) => c.method === 'lt')).toBeUndefined()
  })
})

describe('invoiceService.listDue', () => {
  async function capture(filters = {}, customers: Array<{ id: number }> = []) {
    const customerChain = createChain(() => ({ data: customers, error: null }))
    const invoicesChain = createChain(() => ({ data: [], error: null }))
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'customers' ? customerChain.query : invoicesChain.query
    )
    await invoiceService.listDue(filters)
    return invoicesChain.calls
  }

  it('scopes to unpaid/partial by default and maps search + customer + due-date filters', async () => {
    const calls = await capture(
      { query: 'acme', statuses: ['Unpaid'], customerIds: [1, 2], from: '2026-10-01', to: '2026-11-01' },
      [{ id: 3 }]
    )
    expect(filterCalls(calls, 'in')[0]).toEqual(['status', ['Unpaid']])
    expect(filterCalls(calls, 'in')[1]).toEqual(['customer_id', [1, 2]])
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe(
      'invoice_number.ilike.%acme%,customer_id.in.(3)'
    )
    expect(calls.find((c) => c.method === 'gte')?.args).toEqual(['due_date', '2026-10-01'])
    expect(calls.find((c) => c.method === 'lt')?.args).toEqual(['due_date', '2026-11-01'])
  })

  it('defaults status to unpaid/partial when none are given', async () => {
    const calls = await capture({})
    expect(filterCalls(calls, 'in')[0]).toEqual(['status', ['Unpaid', 'Partial']])
  })

  it('maps rows to invoices with computed paid and due', async () => {
    const { query } = createChain(() => ({ data: [invoiceRow], error: null }))
    supabaseMock.from.mockReturnValue(query)
    const result = await invoiceService.listDue({})
    expect(result).toHaveLength(1)
    expect(result[0].paid).toBe(700)
    expect(result[0].due).toBe(200)
  })
})

describe('invoiceService.getById', () => {
  it('selects detail columns including line items', async () => {
    const { query, calls } = createChain(() => ({ data: invoiceRow, error: null }))
    supabaseMock.from.mockReturnValue(query)

    const inv = await invoiceService.getById(11)

    expect(inv?.id).toBe(11)
    expect(calls.find((c) => c.method === 'select')?.args[0]).toContain('labels(')
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['id', 11])
    expect(calls.find((c) => c.method === 'maybeSingle')).toBeDefined()
  })

  it('returns null when no row matches', async () => {
    const { query } = createChain(() => ({ data: null, error: null }))
    supabaseMock.from.mockReturnValue(query)
    expect(await invoiceService.getById(999)).toBeNull()
  })
})

describe('invoiceService payment operations', () => {
  it('records a payment and refetches the invoice', async () => {
    const insert = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: invoiceRow, error: null }))
    supabaseMock.from.mockReturnValueOnce(insert.query).mockReturnValueOnce(detail.query)

    const inv = await invoiceService.recordPayment(11, {
      amount: 250,
      date: '2026-09-25',
      mode: 'bank_transfer',
      notes: 'settled',
    })

    const insertArgs = insert.calls.find((c) => c.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >
    expect(insertArgs).toEqual({
      invoice_id: 11,
      amount: 250,
      payment_date: '2026-09-25',
      payment_mode: 'bank_transfer',
      notes: 'settled',
    })
    expect(inv?.id).toBe(11)
  })

  it('stores null notes when absent', async () => {
    const insert = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: invoiceRow, error: null }))
    supabaseMock.from.mockReturnValueOnce(insert.query).mockReturnValueOnce(detail.query)

    await invoiceService.recordPayment(11, { amount: 1, date: 'd', mode: 'cash' })
    const insertArgs = insert.calls.find((c) => c.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >
    expect(insertArgs.notes).toBeNull()
  })

  it('updates a payment scoped to its invoice', async () => {
    const update = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: invoiceRow, error: null }))
    supabaseMock.from.mockReturnValueOnce(update.query).mockReturnValueOnce(detail.query)

    await invoiceService.updatePayment(11, 2, {
      amount: 600,
      date: '2026-09-26',
      mode: 'cheque',
      notes: null,
    })

    const updateArgs = update.calls.find((c) => c.method === 'update')?.args[0] as Record<
      string,
      unknown
    >
    expect(updateArgs.amount).toBe(600)
    expect(update.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['id', 2],
      ['invoice_id', 11],
    ])
  })

  it('deletes a payment scoped to its invoice', async () => {
    const del = createChain(() => ({ data: null, error: null }))
    const detail = createChain(() => ({ data: invoiceRow, error: null }))
    supabaseMock.from.mockReturnValueOnce(del.query).mockReturnValueOnce(detail.query)

    const inv = await invoiceService.deletePayment(11, 2)
    expect(del.calls.find((c) => c.method === 'delete')).toBeDefined()
    expect(del.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['id', 2],
      ['invoice_id', 11],
    ])
    expect(inv?.id).toBe(11)
  })
})

describe('invoiceService rpc wrappers', () => {
  it('maps invoice_generation_preview output', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          customer_id: 1,
          customer_name: 'Acme',
          label_count: 3,
          total_weight: 20,
          total_amount: 800,
          has_overlap: false,
        },
      ],
      error: null,
    })
    const rows = await invoiceService.preview('2026-09-01', '2026-10-01')
    expect(supabaseMock.rpc).toHaveBeenCalledWith('invoice_generation_preview', {
      p_period_start: '2026-09-01',
      p_period_end: '2026-10-01',
    })
    expect(rows).toEqual([
      { customerId: 1, customerName: 'Acme', labelCount: 3, totalWeight: 20, totalAmount: 800, hasOverlap: false },
    ])
  })

  it('maps generate result with an overlap skip reason', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          customer_id: 2,
          customer_name: 'Beta',
          invoice_id: null,
          invoice_number: null,
          label_count: 0,
          total_amount: 0,
          total_weight: 0,
          skipped: 'overlap',
        },
      ],
      error: null,
    })
    const result = await invoiceService.generate(2, 'a', 'b', '2026-11-01')
    expect(supabaseMock.rpc).toHaveBeenCalledWith('generate_invoice_for_customer', {
      p_customer_id: 2,
      p_period_start: 'a',
      p_period_end: 'b',
      p_due_date: '2026-11-01',
    })
    expect(result.skipped).toBe('overlap')
    expect(result.invoiceId).toBeNull()
  })

  it('throws when generate returns no rows', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null })
    await expect(invoiceService.generate(1, 'a', 'b', '2026-11-01')).rejects.toThrow(
      'Invoice generation returned no result'
    )
  })

  it('maps bulk generate results', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          customer_id: 1,
          customer_name: 'One',
          invoice_id: 9,
          invoice_number: 'INV-0009',
          label_count: 4,
          total_amount: 100,
          total_weight: 5,
          skipped: null,
        },
        {
          customer_id: 2,
          customer_name: 'Two',
          invoice_id: null,
          invoice_number: null,
          label_count: 0,
          total_amount: 0,
          total_weight: 0,
          skipped: 'no_labels',
        },
      ],
      error: null,
    })
    const results = await invoiceService.bulkGenerate('2026-09-01', '2026-10-01', '2026-11-01')
    expect(supabaseMock.rpc).toHaveBeenCalledWith('generate_invoices_for_period', {
      p_period_start: '2026-09-01',
      p_period_end: '2026-10-01',
      p_due_date: '2026-11-01',
    })
    expect(results).toHaveLength(2)
    expect(results[0].invoiceNumber).toBe('INV-0009')
    expect(results[1].skipped).toBe('no_labels')
  })
})

describe('invoiceService.listAll', () => {
  it('selects detail columns with line items and no pagination', async () => {
    const { query, calls } = createChain(() => ({ data: [invoiceRow], error: null }))
    supabaseMock.from.mockReturnValue(query)

    const result = await invoiceService.listAll({}, 'oldest')

    expect(result).toHaveLength(1)
    expect(result[0].lineItems).toHaveLength(3)
    expect(filterCalls(calls, 'range')).toEqual([])
    expect(filterCalls(calls, 'order')[0]).toEqual(['created_at', { ascending: true }])
    const select = filterCalls(calls, 'select')[0][0] as string
    expect(select).toContain('labels(')
  })

  it('throws when the query errors', async () => {
    const { query } = createChain(() => ({ data: null, error: new Error('boom') }))
    supabaseMock.from.mockReturnValue(query)
    await expect(invoiceService.listAll()).rejects.toThrow('boom')
  })
})

describe('invoiceService.listByIds', () => {
  it('returns invoices in the requested id order', async () => {
    const { query, calls } = createChain(() => ({
      data: [
        { ...invoiceRow, id: 12, invoice_number: 'INV-0012' },
        { ...invoiceRow, id: 11, invoice_number: 'INV-0011' },
      ],
      error: null,
    }))
    supabaseMock.from.mockReturnValue(query)

    const result = await invoiceService.listByIds([11, 12, 99])

    expect(result.map((invoice) => invoice.id)).toEqual([11, 12])
    expect(filterCalls(calls, 'in')[0]).toEqual(['id', [11, 12, 99]])
  })

  it('short-circuits for an empty id list', async () => {
    const result = await invoiceService.listByIds([])
    expect(result).toEqual([])
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })
})