import type { InvoiceOptions, LabelOptions } from '@/lib/types'

export const DEFAULT_LABEL_OPTIONS: LabelOptions = {
  showCompanyName: true,
  showCustomerName: true,
  showSlNo: true,
  showDate: true,
  showWeight: true,
  showAmount: true,
  showRate: false,
  showPhone: false,
  showAddress: false,
}

export const DEFAULT_INVOICE_OPTIONS: InvoiceOptions = {
  showTagline: true,
  showAddress: true,
  showGst: true,
  showPhones: true,
  showEmail: true,
  showWebsite: false,
  showContactPerson: false,
  showDueDate: true,
}

function pickBooleans<T>(raw: unknown, defaults: T): T {
  const source = (raw ?? {}) as Record<string, unknown>
  const resolved: T = { ...defaults }
  for (const key of Object.keys(defaults as object) as (keyof T)[]) {
    const value = source[key as string]
    if (typeof value === 'boolean') {
      resolved[key] = value as T[keyof T]
    }
  }
  return resolved
}

/** Merge a stored JSONB blob over the defaults so missing/legacy keys never break rendering. */
export function resolveLabelOptions(raw: unknown): LabelOptions {
  return pickBooleans(raw, DEFAULT_LABEL_OPTIONS)
}

export function resolveInvoiceOptions(raw: unknown): InvoiceOptions {
  return pickBooleans(raw, DEFAULT_INVOICE_OPTIONS)
}
