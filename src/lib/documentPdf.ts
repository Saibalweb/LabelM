import { formatCurrency, formatDate } from '@/lib/format'
import { DEFAULT_INVOICE_OPTIONS, DEFAULT_LABEL_OPTIONS } from '@/lib/documentOptions'
import { resolveCompanyHeader, resolveInvoiceCustomer } from '@/lib/invoiceDocument'
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  DEFAULT_LABEL_HEIGHT_MM,
  DEFAULT_LABEL_WIDTH_MM,
} from '@/lib/printDocument'
import type {
  CompanyProfile,
  Invoice,
  InvoiceOptions,
  Label,
  LabelOptions,
} from '@/lib/types'

export interface LabelPdfOptions {
  widthMm?: number
  heightMm?: number
  company?: CompanyProfile | null
  options?: LabelOptions
  filename?: string
}

export interface InvoicePdfOptions {
  company?: CompanyProfile | null
  options?: InvoiceOptions
  filename?: string
}

interface PdfLine {
  text: string
  size: number
  bold: boolean
  spaceAfter: number
}

const MM_PER_PT = 0.352778
const A4_MARGIN_MM = 12

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
    lines.push({ text: `WT (g) - ${label.weight}`, size: 8.5, bold: true, spaceAfter: 0.8 })
  }
  if (options.showRate) {
    lines.push({
      text: `RATE - ${formatCurrency(label.rate)}/g`,
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

function toAmount(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'invoice'
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

/**
 * Draws a single A4 invoice page (with automatic page breaks for long line-item
 * tables) onto an existing jsPDF document.
 */
function drawInvoice(
  doc: import('jspdf').jsPDF,
  invoice: Invoice,
  companyProfile: CompanyProfile | null | undefined,
  options: InvoiceOptions
): void {
  const company = resolveCompanyHeader(invoice.companySnapshot, companyProfile ?? null)
  const customer = resolveInvoiceCustomer(invoice)
  const left = A4_MARGIN_MM
  const right = A4_WIDTH_MM - A4_MARGIN_MM
  const contentWidth = right - left
  const bottom = A4_HEIGHT_MM - A4_MARGIN_MM

  const write = (
    text: string,
    x: number,
    y: number,
    { size = 9, bold = false, align }: { size?: number; bold?: boolean; align?: 'right' } = {}
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.text(toPdfText(text), x, y, align ? { align } : undefined)
  }

  // Company header (left)
  let y = A4_MARGIN_MM + 4
  write(company.companyName || 'My Company', left, y, { size: 16, bold: true })
  y += 7
  if (options.showTagline && company.tagline) {
    write(company.tagline, left, y, { size: 9 })
    y += 4.5
  }
  if (options.showAddress && company.address) {
    for (const part of company.address.split('\n')) {
      write(part, left, y, { size: 8.5 })
      y += 4
    }
  }
  if (options.showPhones && company.phones.length > 0) {
    const phones = company.phones
      .map((phone) => `${phone.label ? `${phone.label}: ` : ''}${phone.value}`)
      .join(' · ')
    write(phones, left, y, { size: 8.5 })
    y += 4
  }
  if (options.showEmail && company.email) {
    write(company.email, left, y, { size: 8.5 })
    y += 4
  }
  if (options.showWebsite && company.website) {
    write(company.website, left, y, { size: 8.5 })
    y += 4
  }
  if (options.showGst && company.gstNumber) {
    write(`GSTIN: ${company.gstNumber}`, left, y, { size: 8.5 })
    y += 4
  }
  if (options.showContactPerson && company.contactPerson) {
    write(company.contactPerson, left, y, { size: 8.5 })
    y += 4
  }

  // Invoice meta (right)
  const meta: [string, string][] = [
    ['Invoice No:', `#${invoice.invoiceNumber}`],
    ['Date Issued:', formatDate(invoice.createdAt)],
  ]
  if (options.showDueDate) {
    meta.push(['Due Date:', invoice.dueDate ? formatDate(invoice.dueDate) : '—'])
  }
  meta.push(['Billing Period:', invoice.billingPeriod])
  let metaY = A4_MARGIN_MM + 4
  for (const [label, value] of meta) {
    write(label, right - 44, metaY, { size: 8.5, align: 'right' })
    write(value, right, metaY, { size: 8.5, bold: true, align: 'right' })
    metaY += 5
  }

  y = Math.max(y, metaY) + 4
  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(left, y, right, y)
  y += 9

  // Bill To
  write('BILL TO', left, y, { size: 8, bold: true })
  y += 5
  write(customer.name || 'Unknown customer', left, y, { size: 12, bold: true })
  y += 6
  if (customer.address) {
    for (const part of customer.address.split('\n')) {
      write(part, left, y, { size: 9 })
      y += 4.5
    }
  }
  if (customer.email) {
    write(customer.email, left, y, { size: 9 })
    y += 4.5
  }
  if (customer.phone) {
    write(customer.phone, left, y, { size: 9 })
    y += 4.5
  }
  y += 4

  const colSl = left
  const colDate = left + 20
  const colWeight = left + 72
  const colRate = left + 122
  const colAmount = right

  const drawTableHeader = () => {
    write('SL NO', colSl, y, { size: 8, bold: true })
    write('DATE', colDate, y, { size: 8, bold: true })
    write('WEIGHT (G)', colWeight, y, { size: 8, bold: true, align: 'right' })
    write('RATE', colRate, y, { size: 8, bold: true, align: 'right' })
    write('AMOUNT', colAmount, y, { size: 8, bold: true, align: 'right' })
    y += 2.5
    doc.setDrawColor(120)
    doc.setLineWidth(0.4)
    doc.line(left, y, right, y)
    doc.setLineWidth(0.2)
    y += 5
  }
  drawTableHeader()

  for (const item of invoice.lineItems) {
    if (y > bottom - 22) {
      doc.addPage('a4', 'portrait')
      y = A4_MARGIN_MM + 4
      drawTableHeader()
    }
    write(item.slNo, colSl, y, { size: 8.5 })
    write(formatDate(item.date), colDate, y, { size: 8.5 })
    write(toAmount(item.weightG), colWeight, y, { size: 8.5, align: 'right' })
    write(toAmount(item.rate), colRate, y, { size: 8.5, align: 'right' })
    write(toAmount(item.amount), colAmount, y, { size: 8.5, bold: true, align: 'right' })
    y += 1.5
    doc.setDrawColor(220)
    doc.line(left, y, right, y)
    y += 5
  }

  // Totals
  if (y > bottom - 24) {
    doc.addPage('a4', 'portrait')
    y = A4_MARGIN_MM + 4
  }
  const totalsX = left + contentWidth * 0.6
  y += 4
  doc.setDrawColor(120)
  doc.setLineWidth(0.4)
  doc.line(totalsX, y, right, y)
  doc.setLineWidth(0.2)
  y += 6
  write('Total Weight', totalsX, y, { size: 9 })
  write(`${toAmount(invoice.totalWeight)} g`, right, y, { size: 9, bold: true, align: 'right' })
  y += 8
  write('Total', totalsX, y, { size: 12, bold: true })
  write(formatCurrency(invoice.totalAmount), right, y, { size: 13, bold: true, align: 'right' })
}

/**
 * Renders one A4 PDF page per invoice. jsPDF is imported lazily so it stays out
 * of the initial bundle.
 */
export async function exportInvoicesPdf(
  invoices: Invoice[],
  opts: InvoicePdfOptions = {}
): Promise<void> {
  if (invoices.length === 0) return

  const { jsPDF } = await import('jspdf')
  const options = opts.options ?? DEFAULT_INVOICE_OPTIONS
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  invoices.forEach((invoice, index) => {
    if (index > 0) doc.addPage('a4', 'portrait')
    drawInvoice(doc, invoice, opts.company, options)
  })

  const filename =
    opts.filename ??
    (invoices.length === 1
      ? `invoice-${sanitizeFilename(invoices[0].invoiceNumber)}.pdf`
      : `invoices-${invoices.length}-${todayISO()}.pdf`)
  doc.save(filename)
}

export function exportInvoicePdf(
  invoice: Invoice,
  opts: InvoicePdfOptions = {}
): Promise<void> {
  return exportInvoicesPdf([invoice], {
    ...opts,
    filename: opts.filename ?? `invoice-${sanitizeFilename(invoice.invoiceNumber)}.pdf`,
  })
}
