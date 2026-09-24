import { describe, expect, it, vi } from 'vitest'
import {
  currentMonthValue,
  isoDate,
  isValidRange,
  monthBounds,
  monthLabel,
  monthRangeLabel,
  pad,
  previousMonthValue,
  rangeLabel,
} from '@/lib/period'

describe('pad', () => {
  it('pads single digits', () => {
    expect(pad(5)).toBe('05')
    expect(pad(12)).toBe('12')
    expect(pad(0)).toBe('00')
  })
})

describe('isoDate', () => {
  it('formats a Date into YYYY-MM-DD', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('monthBounds', () => {
  it('returns an exclusive end for a normal month', () => {
    expect(monthBounds('2026-09')).toEqual({ from: '2026-09-01', to: '2026-10-01' })
  })

  it('handles leap-year February', () => {
    expect(monthBounds('2024-02')).toEqual({ from: '2024-02-01', to: '2024-03-01' })
  })

  it('handles non-leap February', () => {
    expect(monthBounds('2026-02')).toEqual({ from: '2026-02-01', to: '2026-03-01' })
  })

  it('handles 30-day months', () => {
    expect(monthBounds('2026-04')).toEqual({ from: '2026-04-01', to: '2026-05-01' })
  })

  it('rolls the year over in December', () => {
    expect(monthBounds('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })

  it('returns null for missing or invalid input', () => {
    expect(monthBounds('')).toBeNull()
    expect(monthBounds('2026')).toBeNull()
    expect(monthBounds('2026-0')).toBeNull()
  })
})

describe('monthLabel', () => {
  it('renders a short month + year', () => {
    expect(monthLabel('2026-09')).toBe('Sep 2026')
    expect(monthLabel('2026-01')).toBe('Jan 2026')
  })

  it('returns a placeholder for invalid input', () => {
    expect(monthLabel('')).toBe('—')
    expect(monthLabel('2026')).toBe('—')
  })
})

describe('monthRangeLabel', () => {
  it('renders first-to-last day of the month', () => {
    expect(monthRangeLabel('2026-02')).toBe('Feb 1, 2026 - Feb 28, 2026')
    expect(monthRangeLabel('2026-04')).toBe('Apr 1, 2026 - Apr 30, 2026')
  })

  it('renders the correct last day on leap years', () => {
    expect(monthRangeLabel('2024-02')).toBe('Feb 1, 2024 - Feb 29, 2024')
  })

  it('returns an empty string for invalid input', () => {
    expect(monthRangeLabel('')).toBe('')
    expect(monthRangeLabel('2026')).toBe('')
  })
})

describe('rangeLabel', () => {
  it('renders an inclusive range by shifting the exclusive end back one day', () => {
    expect(rangeLabel('2026-02-01', '2026-03-01')).toBe('Feb 1, 2026 - Feb 28, 2026')
    expect(rangeLabel('2026-09-24', '2026-09-27')).toBe('Sep 24, 2026 - Sep 26, 2026')
  })

  it('returns an empty string for missing bounds', () => {
    expect(rangeLabel('', '2026-09-27')).toBe('')
    expect(rangeLabel('2026-09-24', '')).toBe('')
  })

  it('renders a reversed label when from equals to (edge, no crash)', () => {
    expect(rangeLabel('2026-09-24', '2026-09-24')).toBe('Sep 24, 2026 - Sep 23, 2026')
  })
})

describe('isValidRange', () => {
  it('accepts a from that is strictly before to', () => {
    expect(isValidRange('2026-01-01', '2026-02-01')).toBe(true)
  })

  it('rejects from == to and from > to', () => {
    expect(isValidRange('2026-01-01', '2026-01-01')).toBe(false)
    expect(isValidRange('2026-02-01', '2026-01-01')).toBe(false)
  })

  it('rejects missing bounds', () => {
    expect(isValidRange('', '2026-02-01')).toBe(false)
    expect(isValidRange('2026-01-01', '')).toBe(false)
    expect(isValidRange('', '')).toBe(false)
  })
})

describe('currentMonthValue / previousMonthValue', () => {
  it('reflect the current clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 24))
    expect(currentMonthValue()).toBe('2026-09')
    expect(previousMonthValue()).toBe('2026-08')
    vi.useRealTimers()
  })

  it('wraps previous month across a year boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15))
    expect(previousMonthValue()).toBe('2025-12')
    vi.useRealTimers()
  })
})