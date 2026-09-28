import { describe, expect, it } from 'vitest'
import {
  LABEL_PRESETS,
  MAX_LONG_MM,
  MAX_SHORT_MM,
  findPreset,
  resolveLabelDimensions,
  validateLabelSize,
} from '@/lib/labelPresets'

describe('labelPresets', () => {
  it('ships the agreed presets', () => {
    expect(LABEL_PRESETS.map((p) => p.id)).toEqual([
      '50x25',
      '60x40',
      '75x50',
      '100x50',
      '100x100',
      '100x150',
    ])
    expect(findPreset('100x150')).toMatchObject({ widthMm: 100, heightMm: 150 })
  })

  it('resolves a known preset to its dimensions', () => {
    expect(resolveLabelDimensions('75x50', 10, 10)).toEqual({ widthMm: 75, heightMm: 50 })
  })

  it('resolves a custom preset to the supplied dimensions', () => {
    expect(resolveLabelDimensions('custom', 80, 120)).toEqual({ widthMm: 80, heightMm: 120 })
  })

  it('accepts sizes up to the 4x6 ceiling', () => {
    expect(validateLabelSize(MAX_SHORT_MM, MAX_LONG_MM).ok).toBe(true)
    // rotated 6x4 is equally valid
    expect(validateLabelSize(MAX_LONG_MM, MAX_SHORT_MM).ok).toBe(true)
  })

  it('rejects a width beyond the print-head ceiling', () => {
    const result = validateLabelSize(110, 110)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('4 × 6')
  })

  it('rejects a long edge beyond 6 inches', () => {
    expect(validateLabelSize(80, 200).ok).toBe(false)
  })

  it('rejects zero or negative dimensions', () => {
    expect(validateLabelSize(0, 40).ok).toBe(false)
    expect(validateLabelSize(60, -1).ok).toBe(false)
  })

  it('warns when close to the maximum', () => {
    const result = validateLabelSize(100, 150)
    expect(result.ok).toBe(true)
    expect(result.warning).toBeDefined()
  })

  it('does not warn for a small label', () => {
    const result = validateLabelSize(60, 40)
    expect(result.ok).toBe(true)
    expect(result.warning).toBeUndefined()
  })
})
