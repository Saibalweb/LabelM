import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { LabelPrintCard } from '@/components/labels/LabelPrintCard'
import { DUMMY_COMPANY, DUMMY_LABEL } from '@/components/labels/labelDummyData'
import type { CompanyProfile, LabelOptions } from '@/lib/types'

const PX_PER_MM = 96 / 25.4
const FRAME_PADDING_PX = 16
const MAX_UPSCALE = 2.4

/**
 * Gray paper backing shown around the white printable label. Represents the
 * physical label paper: it is screen-only (settings preview) and never part
 * of the printed output.
 */
export function LabelPaperFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center rounded-xl border border-outline-variant/70 bg-surface-container p-4 shadow-inner print:hidden">
      {children}
    </div>
  )
}

/**
 * Renders the label at its true millimetre size (with dummy data) inside the
 * gray paper frame, scaled to fit the available width. Used by settings so
 * users see exactly how the printed label will look.
 */
export function ScaledLabelPreview({
  widthMm,
  heightMm,
  options,
  company,
  maxHeightPx = 320,
}: {
  widthMm: number
  heightMm: number
  options?: LabelOptions
  company?: CompanyProfile | null
  maxHeightPx?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const safeW = widthMm > 0 ? widthMm : 1
  const safeH = heightMm > 0 ? heightMm : 1
  const labelWpx = safeW * PX_PER_MM
  const labelHpx = safeH * PX_PER_MM
  const availW = Math.max(0, containerWidth - FRAME_PADDING_PX * 2)
  const availH = maxHeightPx - FRAME_PADDING_PX * 2
  const scale =
    containerWidth > 0 ? Math.min(MAX_UPSCALE, availW / labelWpx, availH / labelHpx) : 1

  return (
    <div ref={containerRef} className="w-full">
      <LabelPaperFrame>
        <div style={{ width: labelWpx * scale, height: labelHpx * scale }}>
          <div
            className="shadow-sm"
            style={{
              width: labelWpx,
              height: labelHpx,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <LabelPrintCard
              label={DUMMY_LABEL}
              company={company ?? DUMMY_COMPANY}
              options={options}
              widthMm={safeW}
              heightMm={safeH}
            />
          </div>
        </div>
      </LabelPaperFrame>
      <p className="mt-2 text-center font-label-sm text-label-sm text-on-surface-variant">
        {safeW} × {safeH} mm · gray area is the paper backing (not printed) · 5 mm safe margin
      </p>
    </div>
  )
}
