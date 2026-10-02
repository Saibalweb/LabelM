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

/**
 * Thermal-head safe margin: printable content always stays this far from the
 * die-cut edge. Rendered as inner padding on the label surface.
 */
export const LABEL_SAFE_MARGIN_MM = 5

export const DEFAULT_LABEL_PRESET_ID = '50x50'
export const DEFAULT_LABEL_WIDTH_MM = 50
export const DEFAULT_LABEL_HEIGHT_MM = 50

/** Indian standard thermal label sizes (square, portrait tag and box label). */
export const LABEL_PRESETS: LabelPreset[] = [
  { id: '50x50', label: '2" × 2" (50 × 50 mm)', widthMm: 50, heightMm: 50 },
  { id: '75x75', label: '3" × 3" (75 × 75 mm)', widthMm: 75, heightMm: 75 },
  { id: '100x100', label: '4" × 4" (100 × 100 mm)', widthMm: 100, heightMm: 100 },
  { id: '50x85', label: '2" × 3.3" (50 × 85 mm)', widthMm: 50, heightMm: 85 },
  { id: '50x100', label: '2" × 4" (50 × 100 mm)', widthMm: 50, heightMm: 100 },
  { id: '75x50', label: '3" × 2" (75 × 50 mm)', widthMm: 75, heightMm: 50 },
  { id: '100x50', label: '4" × 2" (100 × 50 mm)', widthMm: 100, heightMm: 50 },
]

export const CUSTOM_PRESET_ID = 'custom'

export function findPreset(id: string): LabelPreset | undefined {
  return LABEL_PRESETS.find((preset) => preset.id === id)
}

/** Layout family chosen from the aspect ratio: wide labels split into two
 * columns, tall tags stack a centred layout, everything else is square. */
export type LabelLayout = 'square' | 'portrait' | 'landscape'

export function labelLayout(widthMm: number, heightMm: number): LabelLayout {
  if (widthMm <= 0 || heightMm <= 0) return 'square'
  const ratio = widthMm / heightMm
  if (ratio >= 1.3) return 'landscape'
  if (ratio <= 0.77) return 'portrait'
  return 'square'
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
