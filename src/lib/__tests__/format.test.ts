import { describe, expect, it, vi } from 'vitest'
import {
  formatCurrency,
  formatCurrencyWhole,
  formatDate,
  formatDateTime,
  todayInputValue,
} from '@/lib/format'

function stripCurrencySymbol(value: string): string {
  return value.replace(/[^\d.,-]/g, '')
}

describe('formatCurrency', () => {
  it('formats with Indian digit grouping and 2 decimals', () => {
    expect(stripCurrencySymbol(formatCurrency(123456.789))).toBe('1,23,456.79')
    expect(stripCurrencySymbol(formatCurrency(123456789.123))).toBe('12,34,56,789.12')
    expect(stripCurrencySymbol(formatCurrency(0))).toBe('0.00')
    expect(stripCurrencySymbol(formatCurrency(1000))).toBe('1,000.00')
  })

  it('prepends the rupee symbol', () => {
    expect(formatCurrency(10)).toContain('₹')
  })

  it('handles negative values', () => {
    expect(stripCurrencySymbol(formatCurrency(-123456.789))).toBe('-1,23,456.79')
    expect(formatCurrency(-10)).toContain('-')
  })

  it('rounds half values to 2 decimals', () => {
    expect(stripCurrencySymbol(formatCurrency(1.005))).toBe('1.01')
    expect(stripCurrencySymbol(formatCurrency(2.675))).toBe('2.68')
    expect(stripCurrencySymbol(formatCurrency(1.004))).toBe('1.00')
  })
})

describe('formatCurrencyWhole', () => {
  it('rounds to whole rupees', () => {
    expect(stripCurrencySymbol(formatCurrencyWhole(123456.789))).toBe('1,23,457')
    expect(stripCurrencySymbol(formatCurrencyWhole(0))).toBe('0')
    expect(stripCurrencySymbol(formatCurrencyWhole(99.4))).toBe('99')
    expect(stripCurrencySymbol(formatCurrencyWhole(99.6))).toBe('100')
  })

  it('handles negatives', () => {
    expect(stripCurrencySymbol(formatCurrencyWhole(-123456.789))).toBe('-1,23,457')
  })

  it('prepends the rupee symbol', () => {
    expect(formatCurrencyWhole(10)).toContain('₹')
  })
})

describe('formatDate', () => {
  it('renders day, short month and year', () => {
    expect(formatDate('2026-09-24T12:00:00')).toBe('24 Sept 2026')
  })

  it('handles single-digit days', () => {
    expect(formatDate('2026-01-05T12:00:00')).toBe('5 Jan 2026')
  })
})

describe('formatDateTime', () => {
  it('includes date and time', () => {
    const out = formatDateTime('2026-09-24T15:30:00')
    expect(out).toContain('24 Sept 2026')
    expect(out).toMatch(/3:30|15:30/)
  })
})

describe('todayInputValue', () => {
  it('returns the current local date in YYYY-MM-DD', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 24, 10, 0, 0))
    expect(todayInputValue()).toBe('2026-09-24')
    vi.useRealTimers()
  })

  it('pads month and day to two digits', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0, 0))
    expect(todayInputValue()).toBe('2026-01-05')
    vi.useRealTimers()
  })
})