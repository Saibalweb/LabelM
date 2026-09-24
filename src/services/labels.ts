import { supabase } from '@/lib/supabase'
import type {
  CustomerLabelCount,
  Label,
  LabelFilters,
  LabelInput,
  LabelListParams,
  LabelListResult,
  LabelSortKey,
  LabelStats,
  LabelStatus,
} from '@/lib/types'

interface LabelRow {
  id: number
  sl_no: string
  customer_id: number
  label_date: string
  weight: number
  rate: number
  amount: number
  status: LabelStatus
  invoice_id: number | null
  created_at: string
  customers: { name: string } | null
}

const LABEL_COLUMNS = 'id, sl_no, customer_id, label_date, weight, rate, amount, status, invoice_id, created_at, customers(name)'

function toLabel(row: LabelRow): Label {
  const customerName = Array.isArray(row.customers) ? row.customers[0]?.name : row.customers?.name
  return {
    id: row.id,
    slNo: row.sl_no,
    customerId: row.customer_id,
    customerName: customerName ?? null,
    date: row.label_date,
    weight: row.weight,
    rate: row.rate,
    amount: row.amount,
    status: row.status,
    invoiceId: row.invoice_id,
    createdAt: row.created_at,
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function sanitizeTerm(value: string): string {
  return value
    .replace(/[,()"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function matchingCustomerIds(term: string): Promise<number[]> {
  const { data, error } = await supabase.from('customers').select('id').ilike('name', `%${term}%`)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => (row as { id: number }).id)
}

async function resolveSearchIds(filters: LabelFilters): Promise<number[]> {
  const q = sanitizeTerm(filters.query ?? '')
  if (!q) return []
  return matchingCustomerIds(q)
}

const sortColumn: Record<LabelSortKey, { column: string; ascending: boolean }> = {
  newest: { column: 'label_date', ascending: false },
  oldest: { column: 'label_date', ascending: true },
  'amount-desc': { column: 'amount', ascending: false },
  'amount-asc': { column: 'amount', ascending: true },
  'weight-desc': { column: 'weight', ascending: false },
  'customer-asc': { column: 'customers(name)', ascending: true },
}

function buildListQuery(filters: LabelFilters = {}, matchingIds: number[] = []) {
  let query = supabase.from('labels').select(LABEL_COLUMNS, { count: 'exact' })

  const q = sanitizeTerm(filters.query ?? '')
  if (q) {
    // PostgREST's or() tree cannot parse ilike on the embedded customers.name
    // column, so we OR on customer_id.in() using ids resolved beforehand.
    const conditions = [`sl_no.ilike.%${q}%`]
    if (matchingIds.length > 0) conditions.push(`customer_id.in.(${matchingIds.join(',')})`)
    query = query.or(conditions.join(','))
  }

  if (filters.customerIds && filters.customerIds.length > 0) {
    query = query.in('customer_id', filters.customerIds)
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  }

  const billing = filters.billing ?? []
  const hasBilled = billing.includes('billed')
  const hasUnbilled = billing.includes('unbilled')
  if (hasBilled && !hasUnbilled) {
    query = query.not('invoice_id', 'is', null)
  } else if (hasUnbilled && !hasBilled) {
    query = query.is('invoice_id', null)
  }

  if (filters.minWeight != null) query = query.gte('weight', filters.minWeight)
  if (filters.maxWeight != null) query = query.lte('weight', filters.maxWeight)
  if (filters.minAmount != null) query = query.gte('amount', filters.minAmount)
  if (filters.maxAmount != null) query = query.lte('amount', filters.maxAmount)
  if (filters.from) query = query.gte('label_date', filters.from)
  if (filters.to) query = query.lt('label_date', filters.to)

  return query
}

export const labelService = {
  async list(
    filters: LabelFilters = {},
    { page = 1, pageSize = 25, sortBy = 'newest' }: Partial<LabelListParams> = {}
  ): Promise<LabelListResult> {
    const sort = sortColumn[sortBy]
    const matchingIds = await resolveSearchIds(filters)
    let query = buildListQuery(filters, matchingIds)
    query = query.order(sort.column, { ascending: sort.ascending })
    if (sort.column !== 'id') query = query.order('id', { ascending: false })
    query = query.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return {
      data: (data ?? []).map((row) => toLabel(row as unknown as LabelRow)),
      total: count ?? 0,
    }
  },

  async stats(): Promise<LabelStats> {
    const { data, error } = await supabase.rpc('label_stats')
    if (error) throw new Error(error.message)
    const row = data?.[0]
    return {
      totalLabels: row?.total_labels ?? 0,
      totalWeight: Number(row?.total_weight ?? 0),
      minWeight: Number(row?.min_weight ?? 0),
      maxWeight: Number(row?.max_weight ?? 0),
      minAmount: Number(row?.min_amount ?? 0),
      maxAmount: Number(row?.max_amount ?? 0),
      printQueue: row?.print_queue ?? 0,
    }
  },

  async countsByCustomer(): Promise<CustomerLabelCount[]> {
    const { data, error } = await supabase.rpc('label_counts_by_customer')
    if (error) throw new Error(error.message)
    return (data ?? []).map(
      (row: { customer_id: number; label_count: number }) => ({
        customerId: row.customer_id,
        count: row.label_count,
      })
    )
  },

  async listUnbilled(opts: {
    from: string
    to: string
    customerId?: number | null
  }): Promise<Label[]> {
    let query = supabase
      .from('labels')
      .select(LABEL_COLUMNS)
      .is('invoice_id', null)
      .order('label_date', { ascending: true })
      .order('id', { ascending: true })
    if (opts.customerId != null) query = query.eq('customer_id', opts.customerId)
    query = query.gte('label_date', opts.from).lt('label_date', opts.to)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => toLabel(row as unknown as LabelRow))
  },

  async getById(id: number): Promise<Label | null> {
    const { data, error } = await supabase
      .from('labels')
      .select(LABEL_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toLabel(data as unknown as LabelRow) : null
  },

  async create(input: LabelInput): Promise<Label> {
    const { data: slNo, error: slErr } = await supabase.rpc('next_document_number', {
      p_kind: 'label',
      p_prefix: 'LBL',
      p_digits: 4,
    })
    if (slErr) throw new Error(slErr.message)

    const { data, error } = await supabase
      .from('labels')
      .insert({
        sl_no: slNo,
        customer_id: input.customerId,
        label_date: input.date,
        weight: input.weight,
        rate: input.rate,
        amount: round2(input.weight * input.rate),
        status: 'draft',
      })
      .select(LABEL_COLUMNS)
      .single()
    if (error) throw new Error(error.message)
    return toLabel(data as unknown as LabelRow)
  },

  async update(id: number, patch: Partial<Label>): Promise<Label | null> {
    const updates: Record<string, unknown> = {}
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.date !== undefined) updates.label_date = patch.date
    if (patch.customerId !== undefined) updates.customer_id = patch.customerId
    if (patch.weight !== undefined) {
      updates.weight = patch.weight
      const rate = patch.rate ?? (await this.getById(id))?.rate
      if (rate != null) updates.amount = round2(patch.weight * rate)
    }
    if (patch.rate !== undefined) {
      updates.rate = patch.rate
      const weight = patch.weight ?? (await this.getById(id))?.weight
      if (weight != null) updates.amount = round2(weight * patch.rate)
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
      if (error) throw new Error(error.message)
    }
    return this.getById(id)
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from('labels').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}