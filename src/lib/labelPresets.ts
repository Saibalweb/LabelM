export interface LabelPreset {
  id: string
  label: string
  widthMm: number
  heightMm: number
}

/** Zebra ZT411-class print width ceiling (4.09in) and the 4x6in label length. */
export const MAX_SHORT_MM = 101.6
export const MAX_LONG_MM = 152.4
const NEAR_LIMIT_MM = 6

export const DEFAULT_LABEL_WIDTH_MM = 60
export const DEFAULT_LABEL_HEIGHT_MM = 40

export const LABEL_PRESETS: LabelPreset[] = [
  { id: '50x25', label: '50 × 25 mm', widthMm: 50, heightMm: 25 },
  { id: '60x40', label: '60 × 40 mm', widthMm: 60, heightMm: 40 },
  { id: '75x50', label: '75 × 50 mm', widthMm: 75, heightMm: 50 },
  { id: '100x50', label: '100 × 50 mm', widthMm: 100, heightMm: 50 },
  { id: '100x100', label: '100 × 100 mm', widthMm: 100, heightMm: 100 },
  { id: '100x150', label: '100 × 150 mm (4 × 6 in)', widthMm: 100, heightMm: 150 },
]

export const CUSTOM_PRESET_ID = 'custom'

export function findPreset(id: string): LabelPreset | undefined {
  return LABEL_PRESETS.find((preset) => preset.id === id)
}

export interface LabelSizeValidation {
  ok: boolean
  error?: string
  warning?: string
}

/**
 * Validates a label size against the 4x6in ceiling, orientation-safe: the short
 * edge may not exceed 101.6mm and the long edge may not exceed 152.4mm.
 */
export function validateLabelSize(widthMm: number, heightMm: number): LabelSizeValidation {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
    return { ok: false, error: 'Width and height must be greater than 0.' }
  }

  const short = Math.min(widthMm, heightMm)
  const long = Math.max(widthMm, heightMm)

  if (short > MAX_SHORT_MM || long > MAX_LONG_MM) {
    return {
      ok: false,
      error: `Maximum label size is 4 × 6 in (${MAX_SHORT_MM} × ${MAX_LONG_MM} mm).`,
    }
  }

  if (long > MAX_LONG_MM - NEAR_LIMIT_MM || short > MAX_SHORT_MM - NEAR_LIMIT_MM) {
    return { ok: true, warning: 'Close to the printer’s maximum label size.' }
  }

  return { ok: true }
}

export function resolveLabelDimensions(
  preset: string,
  widthMm: number,
  heightMm: number
): { widthMm: number; heightMm: number } {
  const known = findPreset(preset)
  if (known) return { widthMm: known.widthMm, heightMm: known.heightMm }
  return { widthMm, heightMm }
}
