import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INVOICE_OPTIONS,
  DEFAULT_LABEL_OPTIONS,
  resolveInvoiceOptions,
  resolveLabelOptions,
} from '@/lib/documentOptions'

describe('resolveLabelOptions', () => {
  it('returns defaults for null/undefined', () => {
    expect(resolveLabelOptions(null)).toEqual(DEFAULT_LABEL_OPTIONS)
    expect(resolveLabelOptions(undefined)).toEqual(DEFAULT_LABEL_OPTIONS)
  })

  it('applies stored booleans over the defaults', () => {
    const resolved = resolveLabelOptions({ showCompanyName: false, showRate: true })
    expect(resolved.showCompanyName).toBe(false)
    expect(resolved.showRate).toBe(true)
    // untouched keys keep defaults
    expect(resolved.showAmount).toBe(true)
  })

  it('ignores unknown keys and non-boolean values', () => {
    const resolved = resolveLabelOptions({ showAmount: 'yes', somethingElse: true })
    expect(resolved.showAmount).toBe(true)
    expect(resolved).not.toHaveProperty('somethingElse')
  })

  it('treats a non-object blob as empty', () => {
    expect(resolveLabelOptions('nope')).toEqual(DEFAULT_LABEL_OPTIONS)
  })
})

describe('resolveInvoiceOptions', () => {
  it('applies stored booleans and keeps defaults', () => {
    const resolved = resolveInvoiceOptions({ showDueDate: false })
    expect(resolved.showDueDate).toBe(false)
    expect(resolved.showGst).toBe(true)
  })

  it('returns defaults for null', () => {
    expect(resolveInvoiceOptions(null)).toEqual(DEFAULT_INVOICE_OPTIONS)
  })
})
