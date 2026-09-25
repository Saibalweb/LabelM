import { supabase } from '@/lib/supabase'
import { pricesService } from '@/services/prices'
import type { Customer, CustomerInput } from '@/lib/types'

interface CustomerRow {
  id: number
  name: string
  address: string | null
  phone: string | null
  email: string | null
  gst_number: string | null
  created_at: string
  updated_at: string
  customer_prices: Array<{ effective_from: string; effective_to: string | null; rate: number }>
}

function currentRateOf(row: CustomerRow): number | null {
  const open = row.customer_prices.find((price) => price.effective_to === null)
  if (open) return open.rate
  const latest = row.customer_prices.reduce<CustomerRow['customer_prices'][number] | null>(
    (best, price) =>
      !best || price.effective_from > best.effective_from ? price : best,
    null
  )
  return latest ? latest.rate : null
}

const INT4_MAX = 2_147_483_647

// Matches ids whose decimal form starts with `prefix`, e.g. "12" covers
// 12, 120–129, 1200–1299, ... PostgREST cannot cast to text in a filter, so
// we express the prefix as a set of [n*10^k, (n+1)*10^k) integer ranges.
// The final range is clamped to INT4_MAX when the exclusive upper bound would
// overflow the int4 column type (e.g. prefix "2" → [2_000_000_000, 2_147_483_647]).
function idPrefixRangeConditions(prefix: string): string[] {
  const base = Number(prefix)
  if (!Number.isFinite(base) || base < 0) return []
  const startDigits = prefix.length
  const conditions: string[] = []
  for (let digits = startDigits; digits <= 10; digits++) {
    const pow = 10 ** (digits - startDigits)
    const lower = base * pow
    if (lower > INT4_MAX) break
    const upper = (base + 1) * pow
    if (upper > INT4_MAX) {
      conditions.push(`and(id.gte.${lower},id.lte.${INT4_MAX})`)
      break
    }
    conditions.push(`and(id.gte.${lower},id.lt.${upper})`)
  }
  return conditions
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    gst_number: row.gst_number,
    currentRate: currentRateOf(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const CUSTOMER_COLUMNS = 'id, name, address, phone, email, gst_number, created_at, updated_at, customer_prices(effective_from, effective_to, rate)'

export const customerService = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .is('deleted_at', null)
      .order('id', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => toCustomer(row as CustomerRow))
  },

  async search(query: string, limit = 25): Promise<Customer[]> {
    const trimmed = query.trim()
    if (!trimmed) return []
    const numeric = /^\d+$/.test(trimmed)
    const conditions = numeric ? idPrefixRangeConditions(trimmed) : []
    if (numeric && conditions.length === 0) return []
    let builder = supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .is('deleted_at', null)
    builder = numeric
      ? builder.or(conditions.join(','))
      : builder.ilike('name', `%${trimmed}%`)
    const { data, error } = await builder.order('id', { ascending: true }).limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => toCustomer(row as CustomerRow))
  },

  async getById(id: number): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toCustomer(data as CustomerRow) : null
  },

  async create(input: CustomerInput): Promise<Customer> {
    const { rate, ...fields } = input
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: fields.name,
        address: fields.address ?? null,
        phone: fields.phone ?? null,
        email: fields.email ?? null,
        gst_number: fields.gst_number ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    if (rate != null) {
      await pricesService.setRate(data.id, rate)
    }
    return (await this.getById(data.id)) as Customer
  },

  async update(id: number, patch: Partial<CustomerInput>): Promise<Customer | null> {
    const { rate, ...fields } = patch
    const updates: Record<string, string | null> = {}
    if (fields.name !== undefined) updates.name = fields.name
    if (fields.address !== undefined) updates.address = fields.address ?? null
    if (fields.phone !== undefined) updates.phone = fields.phone ?? null
    if (fields.email !== undefined) updates.email = fields.email ?? null
    if (fields.gst_number !== undefined) updates.gst_number = fields.gst_number ?? null
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
    }
    if (rate != null) {
      await pricesService.setRate(id, rate)
    }
    return this.getById(id)
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_customer', { p_customer_id: id })
    if (error) throw new Error(error.message)
  },

  async restore(id: number): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: null })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}