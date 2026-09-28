import { formatCurrency, formatDate } from '@/lib/format'
import { DEFAULT_LABEL_OPTIONS } from '@/lib/documentOptions'
import {
  DEFAULT_LABEL_HEIGHT_MM,
  DEFAULT_LABEL_WIDTH_MM,
} from '@/lib/printLabel'
import type { CompanyProfile, Label, LabelOptions } from '@/lib/types'

export interface LabelPdfOptions {
  widthMm?: number
  heightMm?: number
  company?: CompanyProfile | null
  options?: LabelOptions
  filename?: string
}

interface PdfLine {
  text: string
  size: number
  bold: boolean
  spaceAfter: number
}

const MM_PER_PT = 0.352778

function buildLines(
  label: Label,
  company: CompanyProfile | null | undefined,
  options: LabelOptions
): PdfLine[] {
  const lines: PdfLine[] = []
  const companyName = company?.companyName || 'My Company'
  const phone = company?.phones.find((entry) => entry.showOnLabel) ?? company?.phones[0]

  if (options.showCompanyName) {
    lines.push({ text: companyName.toUpperCase(), size: 12, bold: true, spaceAfter: 1.2 })
  }
  if (options.showCustomerName) {
    lines.push({
      text: (label.customerName || 'Walk-in Customer').toUpperCase(),
      size: 8,
      bold: false,
      spaceAfter: 0.6,
    })
  }
  if (options.showSlNo) {
    lines.push({ text: `SL No: ${label.slNo}`, size: 8, bold: false, spaceAfter: 1.6 })
  }
  if (options.showDate) {
    lines.push({ text: `DATE - ${formatDate(label.date)}`, size: 8.5, bold: true, spaceAfter: 0.8 })
  }
  if (options.showWeight) {
    lines.push({ text: `WT (kg) - ${label.weight}`, size: 8.5, bold: true, spaceAfter: 0.8 })
  }
  if (options.showRate) {
    lines.push({
      text: `RATE - ${formatCurrency(label.rate)}/kg`,
      size: 8.5,
      bold: true,
      spaceAfter: 0.8,
    })
  }
  if (options.showAmount) {
    lines.push({
      text: `AMOUNT - ${formatCurrency(label.amount)}`,
      size: 8.5,
      bold: true,
      spaceAfter: 0.8,
    })
  }
  if (options.showPhone && phone) {
    lines.push({ text: phone.value, size: 7, bold: false, spaceAfter: 0.4 })
  }
  if (options.showAddress && company?.address) {
    for (const part of company.address.split('\n')) {
      lines.push({ text: part, size: 7, bold: false, spaceAfter: 0.3 })
    }
  }
  return lines
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * jsPDF's built-in Helvetica only covers WinAnsi (Latin-1), so glyphs like the
 * rupee sign (U+20B9) render as garbage. Map the common ones to ASCII
 * equivalents and drop anything still outside Latin-1.
 */
function toPdfText(text: string): string {
  const mapped = text
    .replace(/₹/g, 'Rs ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
  return Array.from(mapped)
    .filter((char) => (char.codePointAt(0) ?? 0) <= 0xff)
    .join('')
}

/**
 * Renders one PDF page per label at the configured size (default 60x40mm).
 * jsPDF is imported lazily so it stays out of the initial bundle.
 */
export async function exportLabelsPdf(
  labels: Label[],
  opts: LabelPdfOptions = {}
): Promise<void> {
  if (labels.length === 0) return

  const { jsPDF } = await import('jspdf')
  const width = opts.widthMm ?? DEFAULT_LABEL_WIDTH_MM
  const height = opts.heightMm ?? DEFAULT_LABEL_HEIGHT_MM
  const options = opts.options ?? DEFAULT_LABEL_OPTIONS
  const orientation = width >= height ? 'landscape' : 'portrait'
  const maxTextWidth = width - 6

  const doc = new jsPDF({ unit: 'mm', format: [width, height], orientation })

  labels.forEach((label, index) => {
    if (index > 0) doc.addPage([width, height], orientation)

    const lines = buildLines(label, opts.company, options)
    if (lines.length === 0) return

    // Measure to vertically centre the block.
    let total = 0
    for (const line of lines) {
      doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
      doc.setFontSize(line.size)
      const dims = doc.getTextDimensions(toPdfText(line.text), { maxWidth: maxTextWidth })
      total += dims.h + line.spaceAfter
    }

    let y = Math.max(3, (height - total) / 2) + lines[0].size * MM_PER_PT
    for (const line of lines) {
      doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
      doc.setFontSize(line.size)
      const text = toPdfText(line.text)
      const dims = doc.getTextDimensions(text, { maxWidth: maxTextWidth })
      doc.text(text, width / 2, y, { align: 'center', maxWidth: maxTextWidth })
      y += dims.h + line.spaceAfter
    }
  })

  const filename =
    opts.filename ??
    (labels.length === 1
      ? `label-${labels[0].slNo}.pdf`
      : `labels-${labels.length}-${todayISO()}.pdf`)
  doc.save(filename)
}

export function exportLabelPdf(label: Label, opts: LabelPdfOptions = {}): Promise<void> {
  return exportLabelsPdf([label], {
    ...opts,
    filename: opts.filename ?? `label-${label.slNo}.pdf`,
  })
}
