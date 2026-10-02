import type { ReactNode } from 'react'
import { formatAmount, formatCurrency, formatDate } from '@/lib/format'
import { DEFAULT_LABEL_OPTIONS } from '@/lib/documentOptions'
import {
  DEFAULT_LABEL_HEIGHT_MM,
  DEFAULT_LABEL_WIDTH_MM,
  LABEL_SAFE_MARGIN_MM,
  labelLayout,
} from '@/lib/labelPresets'
import type { CompanyProfile, Label, LabelOptions } from '@/lib/types'

/** A field slot that keeps its space when the toggle is off. Inline
 * visibility wins over the print stylesheet's `visibility: visible` reset. */
function Slot({
  on,
  children,
  className,
}: {
  on: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className} style={on ? undefined : { visibility: 'hidden' }}>
      {children}
    </div>
  )
}

/**
 * Thermal label markup shared by the preview page, the dashboard's one-click
 * print, bulk print/PDF and the settings preview. Wrap it in an element with
 * class `label-sheet` (inside the area passed to `runLabelPrint`) to print.
 *
 * The design follows the Stitch "Thermal Label Variants" sheet: a white
 * printable surface with a fixed 5mm safe margin, monospace typography and
 * fixed layout zones (header / customer+serial / metrics / grand total box).
 * Disabled fields keep their slot as empty space (visibility hidden) so the
 * label ratio and layout never shift. The layout adapts to the aspect ratio:
 * wide labels use a two-column split, square/tall labels stack vertically.
 */
export function LabelPrintCard({
  label,
  company,
  options = DEFAULT_LABEL_OPTIONS,
  widthMm = DEFAULT_LABEL_WIDTH_MM,
  heightMm = DEFAULT_LABEL_HEIGHT_MM,
}: {
  label: Label
  company?: CompanyProfile | null
  options?: LabelOptions
  widthMm?: number
  heightMm?: number
}) {
  const companyName = company?.companyName || 'My Company'
  const customerName = label.customerName || 'Walk-in Customer'
  const labelPhone = company?.phones.find((phone) => phone.showOnLabel) ?? company?.phones[0]
  const address = company?.address ?? null

  const layout = labelLayout(widthMm, heightMm)
  // Typography scale: a 50mm-short-edge label is 1x, everything scales with it.
  const s = Math.min(2.2, Math.max(0.8, Math.min(widthMm, heightMm) / 50))
  const mm = (value: number) => `${(value * s).toFixed(2)}mm`

  const text = {
    company: { fontSize: mm(3.6) },
    sub: { fontSize: mm(2.1) },
    micro: { fontSize: mm(1.8) },
    customer: { fontSize: mm(2.9) },
    serial: { fontSize: mm(2.2) },
    metricLabel: { fontSize: mm(2.4) },
    metricValue: { fontSize: mm(2.6) },
    totalLabel: { fontSize: mm(2.3) },
    totalValue: { fontSize: mm(3.4) },
  } as const

  const headerLines = (
    <>
      <Slot on={options.showCompanyName}>
        <h2
          className="leading-none font-black tracking-tight text-black uppercase"
          style={text.company}
        >
          {companyName}
        </h2>
      </Slot>
      <Slot on={options.showPhone && labelPhone != null} className="mt-0.5">
        <p className="font-bold text-neutral-800" style={text.sub}>
          TEL: {labelPhone?.value ?? '—'}
        </p>
      </Slot>
      <Slot on={options.showAddress && address != null} className="mt-0.5">
        <p className="leading-tight text-neutral-600 uppercase" style={text.micro}>
          {address ?? '—'}
        </p>
      </Slot>
    </>
  )

  const customerBlock = (
    <Slot on={options.showCustomerName}>
      <span
        className="block leading-none font-bold tracking-wider text-neutral-500 uppercase"
        style={text.micro}
      >
        Billed to / Customer
      </span>
      <span
        className="mt-0.5 block leading-snug font-black text-neutral-900 uppercase"
        style={text.customer}
      >
        {customerName}
      </span>
    </Slot>
  )

  const serialBlock = (
    <Slot on={options.showSlNo} className="text-right">
      <span
        className="block leading-none font-bold tracking-wider text-neutral-500 uppercase"
        style={text.micro}
      >
        Serial No.
      </span>
      <span
        className="mt-0.5 inline-block rounded-[1px] border border-black px-1 py-0.5 font-extrabold text-black"
        style={text.serial}
      >
        {label.slNo}
      </span>
    </Slot>
  )

  const metricRow = (
    on: boolean,
    rowLabel: string,
    value: string,
    valueStyle: keyof typeof text = 'metricValue'
  ) => (
    <Slot on={on} className="flex items-baseline justify-between py-0.5">
      <span className="font-medium text-neutral-600" style={text.metricLabel}>
        {rowLabel}
      </span>
      <span className="font-bold text-neutral-900" style={text[valueStyle]}>
        {value}
      </span>
    </Slot>
  )

  const totalBox = (centered: boolean) => (
    <Slot
      on={options.showAmount}
      className={`flex rounded-[1px] border-2 border-black bg-white p-1 ${
        centered ? 'flex-col items-center' : 'items-baseline justify-between'
      }`}
    >
      <span className="font-black tracking-wider text-black uppercase" style={text.totalLabel}>
        Grand Total:
      </span>
      <span className="font-black tracking-tight text-black" style={text.totalValue}>
        {formatCurrency(label.amount)}
      </span>
    </Slot>
  )

  return (
    <div
      className="label-print-root flex flex-col overflow-hidden rounded-[1mm] border border-black/70 bg-white font-mono text-black select-none"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: `${LABEL_SAFE_MARGIN_MM}mm`,
      }}
    >
      {layout === 'landscape' ? (
        <div className="flex h-full min-h-0 flex-row divide-x-2 divide-black">
          {/* Left column: shipper identity + consignee + dispatch meta */}
          <div className="flex w-7/12 flex-col justify-between pr-2">
            <div className="border-b border-black pb-1">{headerLines}</div>
            <div className="my-1 rounded-[1px] border border-black p-1">{customerBlock}</div>
            <div className="flex items-baseline justify-between border-t border-neutral-300 pt-0.5">
              <Slot on={options.showDate}>
                <span className="font-semibold text-neutral-500" style={text.micro}>
                  DATE:{' '}
                </span>
                <span className="font-bold text-neutral-900" style={text.serial}>
                  {formatDate(label.date)}
                </span>
              </Slot>
              <Slot on={options.showSlNo}>
                <span className="font-semibold text-neutral-500" style={text.micro}>
                  SL:{' '}
                </span>
                <span className="font-black text-neutral-900" style={text.serial}>
                  {label.slNo}
                </span>
              </Slot>
            </div>
          </div>
          {/* Right column: weight/rate matrix + total box */}
          <div className="flex w-5/12 flex-col justify-between pl-2">
            <div className="rounded-[1px] border border-black">
              <Slot on={options.showWeight} className="border-b border-black/40 p-1 text-center">
                <span
                  className="block font-bold text-neutral-600 uppercase"
                  style={text.micro}
                >
                  Net Weight
                </span>
                <span
                  className="block leading-tight font-black text-neutral-900"
                  style={text.metricValue}
                >
                  {formatAmount(label.weight)} g
                </span>
              </Slot>
              <Slot on={options.showRate} className="flex items-baseline justify-between px-1 py-0.5">
                <span className="font-semibold text-neutral-600" style={text.sub}>
                  RATE:
                </span>
                <span className="font-bold text-neutral-900" style={text.sub}>
                  {formatCurrency(label.rate)}/g
                </span>
              </Slot>
            </div>
            {totalBox(true)}
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col justify-between">
          {/* Company header */}
          <div className="border-b border-black pb-1 text-center">{headerLines}</div>
          {/* Customer + serial */}
          <div className="flex items-baseline justify-between border-b border-black/80 py-0.5">
            {customerBlock}
            {serialBlock}
          </div>
          {/* Metrics */}
          <div className="my-auto divide-y divide-neutral-300 border-b border-black/60">
            {metricRow(options.showDate, 'DATE:', formatDate(label.date))}
            {metricRow(options.showWeight, 'WEIGHT:', `${formatAmount(label.weight)} g`)}
            {metricRow(options.showRate, 'RATE:', `${formatCurrency(label.rate)}/g`)}
          </div>
          {/* Grand total */}
          {totalBox(false)}
        </div>
      )}
    </div>
  )
}
