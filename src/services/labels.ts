import { supabase } from '@/lib/supabase'
import type { Label, LabelInput, LabelStatus } from '@/lib/types'

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

export const labelService = {
  async list(): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select(LABEL_COLUMNS)
      .order('label_date', { ascending: false })
      .order('id', { ascending: false })
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