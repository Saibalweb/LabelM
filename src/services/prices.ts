import { supabase } from '@/lib/supabase'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export const pricesService = {
  async getCurrentRate(customerId: number): Promise<number | null> {
    const { data, error } = await supabase
      .from('customer_prices')
      .select('rate')
      .eq('customer_id', customerId)
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data?.rate ?? null
  },

  async setRate(customerId: number, rate: number, effectiveFrom?: string): Promise<void> {
    const from = effectiveFrom ?? today()

    const { error: closeError } = await supabase
      .from('customer_prices')
      .update({ effective_to: from })
      .eq('customer_id', customerId)
      .is('effective_to', null)
    if (closeError) throw new Error(closeError.message)

    const { error: insertError } = await supabase
      .from('customer_prices')
      .insert({ customer_id: customerId, rate, effective_from: from, effective_to: null })
    if (insertError) throw new Error(insertError.message)
  },
}