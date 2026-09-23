import { supabase } from '@/lib/supabase'
import type {
  Invoice,
  InvoiceFilters,
  InvoiceGenerationResult,
  InvoiceLineItem,
  InvoiceListParams,
  InvoiceListResult,
  InvoicePayment,
  InvoicePaymentInput,
  InvoicePreviewRow,
  InvoiceSortKey,
  InvoiceStatus,
  PaymentMode,
} from '@/lib/types'

interface CustomerEmbed {
  name: string
  address: string | null
  email: string | null
  phone: string | null
}

interface LabelEmbed {
  id: number
  sl_no: string
  label_date: string
  weight: number
  rate: number
  amount: number
}

interface PaymentEmbed {
  id: number
  amount: number
  payment_date: string
  payment_mode: PaymentMode
  notes: string | null
}

interface InvoiceRow {
  id: number
  invoice_number: string
  customer_id: number
  period_start: string
  period_end: string
  total_amount: number
  total_weight: number | null
  status: InvoiceStatus
  due_date: string | null
  created_at: string
  customers: CustomerEmbed | CustomerEmbed[] | null
  labels: LabelEmbed[] | null
  invoice_payments: PaymentEmbed[] | null
}

const LIST_COLUMNS =
  'id, invoice_number, customer_id, period_start, period_end, total_amount, total_weight, status, due_date, created_at, customers(name, address, email, phone), invoice_payments(id, amount, payment_date, payment_mode, notes)'

const DETAIL_COLUMNS = `${LIST_COLUMNS}, labels(id, sl_no, label_date, weight, rate, amount)`

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function monthLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function rangeLabel(start: string, endExclusive: string): string {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${endExclusive}T00:00:00`)
  endDate.setDate(endDate.getDate() - 1)
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(startDate)} - ${fmt(endDate)}`
}

function toLineItem(row: LabelEmbed): InvoiceLineItem {
  return {
    id: row.id,
    slNo: row.sl_no,
    date: row.label_date,
    weightKg: row.weight,
    rate: row.rate,
    amount: row.amount,
  }
}

function toPayment(row: PaymentEmbed): InvoicePayment {
  return {
    id: row.id,
    amount: row.amount,
    date: row.payment_date,
    mode: row.payment_mode,
    notes: row.notes,
    receivedBy: null,
  }
}

function toInvoice(row: InvoiceRow): Invoice {
  const customer = first(row.customers)
  const lineItems = (row.labels ?? [])
    .map(toLineItem)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date)))
  const payments = (row.invoice_payments ?? [])
    .map(toPayment)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date)))
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const total = Number(row.total_amount)

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: customer?.name ?? 'Unknown customer',
    customerAddress: customer?.address ?? null,
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    billingPeriod: monthLabel(row.period_start),
    period: rangeLabel(row.period_start, row.period_end),
    totalAmount: total,
    totalWeight: Number(row.total_weight ?? 0),
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    paid,
    due: Math.max(0, total - paid),
    lineItems,
    payments,
  }
}

function toGenerationResult(row: {
  customer_id: number
  customer_name: string
  invoice_id: number | null
  invoice_number: string | null
  label_count: number
  total_amount: number
  total_weight: number
  skipped: string | null
}): InvoiceGenerationResult {
  return {
    customerId: row.customer_id,
    customerName: row.customer_name,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    labelCount: Number(row.label_count),
    totalAmount: Number(row.total_amount),
    totalWeight: Number(row.total_weight),
    skipped: (row.skipped as InvoiceGenerationResult['skipped']) ?? null,
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const sortColumn: Record<InvoiceSortKey, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  'amount-desc': { column: 'total_amount', ascending: false },
  'amount-asc': { column: 'total_amount', ascending: true },
}

function buildListQuery(filters: InvoiceFilters = {}) {
  let query = supabase.from('invoices').select(LIST_COLUMNS, { count: 'exact' })

  const q = filters.query?.trim()
  if (q) {
    query = query.or(`invoice_number.ilike.%${q}%,customers.name.ilike.%${q}%`)
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  }

  if (filters.customerIds && filters.customerIds.length > 0) {
    query = query.in('customer_id', filters.customerIds)
  }

  if (filters.from) query = query.gte('period_start', filters.from)
  if (filters.to) query = query.lt('period_start', filters.to)

  if (filters.minAmount != null) query = query.gte('total_amount', filters.minAmount)
  if (filters.maxAmount != null) query = query.lte('total_amount', filters.maxAmount)

  if (filters.overdue) {
    query = query.in('status', ['Unpaid', 'Partial']).lt('due_date', todayISO())
  }

  return query
}

export const invoiceService = {
  async list(filters: InvoiceFilters = {}): Promise<Invoice[]> {
    let query = buildListQuery(filters).order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => toInvoice(row as unknown as InvoiceRow))
  },

  async listPage(
    filters: InvoiceFilters = {},
    { page = 1, pageSize = 25, sortBy = 'newest' }: Partial<InvoiceListParams> = {}
  ): Promise<InvoiceListResult> {
    const sort = sortColumn[sortBy]
    let query = buildListQuery(filters)
    query = query.order(sort.column, { ascending: sort.ascending })
    if (sort.column !== 'id') query = query.order('id', { ascending: false })
    query = query.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return {
      data: (data ?? []).map((row) => toInvoice(row as unknown as InvoiceRow)),
      total: count ?? 0,
    }
  },

  async getById(id: number): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toInvoice(data as unknown as InvoiceRow) : null
  },

  async preview(from: string, to: string): Promise<InvoicePreviewRow[]> {
    const { data, error } = await supabase.rpc('invoice_generation_preview', {
      p_period_start: from,
      p_period_end: to,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map(
      (row: {
        customer_id: number
        customer_name: string
        label_count: number
        total_weight: number
        total_amount: number
        has_overlap: boolean
      }) => ({
        customerId: row.customer_id,
        customerName: row.customer_name,
        labelCount: Number(row.label_count),
        totalWeight: Number(row.total_weight),
        totalAmount: Number(row.total_amount),
        hasOverlap: row.has_overlap,
      })
    )
  },

  async generate(
    customerId: number,
    from: string,
    to: string
  ): Promise<InvoiceGenerationResult> {
    const { data, error } = await supabase.rpc('generate_invoice_for_customer', {
      p_customer_id: customerId,
      p_period_start: from,
      p_period_end: to,
    })
    if (error) throw new Error(error.message)
    const row = (data ?? [])[0]
    if (!row) throw new Error('Invoice generation returned no result')
    return toGenerationResult(row)
  },

  async bulkGenerate(from: string, to: string): Promise<InvoiceGenerationResult[]> {
    const { data, error } = await supabase.rpc('generate_invoices_for_period', {
      p_period_start: from,
      p_period_end: to,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toGenerationResult)
  },

  async recordPayment(
    invoiceId: number,
    input: InvoicePaymentInput
  ): Promise<Invoice | null> {
    const { error } = await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: input.amount,
      payment_date: input.date,
      payment_mode: input.mode,
      notes: input.notes ?? null,
    })
    if (error) throw new Error(error.message)
    return this.getById(invoiceId)
  },

  async updatePayment(
    invoiceId: number,
    paymentId: number,
    input: InvoicePaymentInput
  ): Promise<Invoice | null> {
    const { error } = await supabase
      .from('invoice_payments')
      .update({
        amount: input.amount,
        payment_date: input.date,
        payment_mode: input.mode,
        notes: input.notes ?? null,
      })
      .eq('id', paymentId)
      .eq('invoice_id', invoiceId)
    if (error) throw new Error(error.message)
    return this.getById(invoiceId)
  },

  async deletePayment(
    invoiceId: number,
    paymentId: number
  ): Promise<Invoice | null> {
    const { error } = await supabase
      .from('invoice_payments')
      .delete()
      .eq('id', paymentId)
      .eq('invoice_id', invoiceId)
    if (error) throw new Error(error.message)
    return this.getById(invoiceId)
  },
}
