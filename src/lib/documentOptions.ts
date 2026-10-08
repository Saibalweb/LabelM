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

/**
 * Fields that must always appear on a label. They cannot be switched off, so a
 * label can never be printed completely blank.
 */
export const MANDATORY_LABEL_OPTIONS: (keyof LabelOptions)[] = [
  'showCompanyName',
  'showCustomerName',
  'showDate',
  'showWeight',
]

export function isMandatoryLabelOption(key: keyof LabelOptions): boolean {
  return MANDATORY_LABEL_OPTIONS.includes(key)
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
  const resolved = pickBooleans(raw, DEFAULT_LABEL_OPTIONS)
  // Mandatory fields are always on, even if an older row stored them as false.
  for (const key of MANDATORY_LABEL_OPTIONS) {
    resolved[key] = true
  }
  return resolved
}

export function resolveInvoiceOptions(raw: unknown): InvoiceOptions {
  return pickBooleans(raw, DEFAULT_INVOICE_OPTIONS)
}
