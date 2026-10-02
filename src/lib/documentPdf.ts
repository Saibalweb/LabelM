import logoDataUrl from '@/assets/brand/logo.png?inline'
import { formatAmount, formatCurrency, formatDate, todayISO } from '@/lib/format'
import { DEFAULT_INVOICE_OPTIONS, DEFAULT_LABEL_OPTIONS } from '@/lib/documentOptions'
import { resolveCompanyHeader, resolveInvoiceCustomer } from '@/lib/invoiceDocument'
import {
  DEFAULT_LABEL_HEIGHT_MM,
  DEFAULT_LABEL_WIDTH_MM,
  LABEL_SAFE_MARGIN_MM,
} from '@/lib/labelPresets'
import { A4_HEIGHT_MM, A4_WIDTH_MM } from '@/lib/printDocument'
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

const MM_PER_PT = 0.352778
const A4_MARGIN_MM = 12

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
 * Renders one PDF page per label at the configured size (default 50x50mm),
 * mirroring the on-screen thermal layout: 5mm safe margin, header / customer
 * + serial / metric rows / boxed grand total. Hidden fields keep their slot
 * as empty space so the layout ratio stays fixed.
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

  const doc = new jsPDF({ unit: 'mm', format: [width, height], orientation })

  labels.forEach((label, index) => {
    if (index > 0) doc.addPage([width, height], orientation)
    drawLabel(doc, label, opts.company, options, width, height)
  })

  const filename =
    opts.filename ??
    (labels.length === 1
      ? `label-${labels[0].slNo}.pdf`
      : `labels-${labels.length}-${todayISO()}.pdf`)
  doc.save(filename)
}

function drawLabel(
  doc: import('jspdf').jsPDF,
  label: Label,
  company: CompanyProfile | null | undefined,
  options: LabelOptions,
  width: number,
  height: number
): void {
  const s = Math.min(2.2, Math.max(0.8, Math.min(width, height) / 50))
  const m = LABEL_SAFE_MARGIN_MM
  const x0 = m
  const iw = width - 2 * m
  const ih = height - 2 * m
  const right = x0 + iw

  const companyName = (company?.companyName || 'My Company').toUpperCase()
  const customerName = (label.customerName || 'Walk-in Customer').toUpperCase()
  const phone = company?.phones.find((entry) => entry.showOnLabel) ?? company?.phones[0]
  const address = company?.address ?? null

  const write = (
    text: string,
    x: number,
    y: number,
    { size = 7.5 * s, bold = false, align }: { size?: number; bold?: boolean; align?: 'center' | 'right' } = {}
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.text(toPdfText(text), x, y, align ? { align } : undefined)
  }

  // Fixed zone heights (mm) — reserved even when a field is hidden.
  const headerH = 9.6 * s
  const customerH = 6 * s
  const metricsH = 3 * 3.6 * s
  const totalH = 6.5 * s
  const gap = Math.max(1 * s, (ih - (headerH + customerH + metricsH + totalH)) / 4)

  let y = m

  // Header zone (centred company identity)
  let cy = y
  if (options.showCompanyName) {
    write(companyName, width / 2, cy + 11 * s * MM_PER_PT, { size: 11 * s, bold: true, align: 'center' })
  }
  cy += 4.2 * s
  if (options.showPhone && phone) {
    write(`TEL: ${phone.value}`, width / 2, cy + 6 * s * MM_PER_PT, { size: 6 * s, bold: true, align: 'center' })
  }
  cy += 2.7 * s
  if (options.showAddress && address) {
    write(address.replace(/\n/g, ', ').toUpperCase(), width / 2, cy + 5 * s * MM_PER_PT, {
      size: 5 * s,
      align: 'center',
    })
  }
  cy += 2.7 * s
  doc.setDrawColor(0)
  doc.setLineWidth(0.3 * s)
  doc.line(x0, y + headerH, right, y + headerH)
  y += headerH + gap

  // Customer + serial zone
  const custBase = y + 2.2 * s
  if (options.showCustomerName) {
    write('BILLED TO / CUSTOMER', x0, custBase, { size: 5 * s, bold: true })
    write(customerName, x0, custBase + 3.4 * s, { size: 8.5 * s, bold: true })
  }
  if (options.showSlNo) {
    write('SERIAL NO.', right, custBase, { size: 5 * s, bold: true, align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7 * s)
    const sl = toPdfText(label.slNo)
    const tw = doc.getTextDimensions(sl).w
    const pad = 0.8 * s
    doc.setLineWidth(0.2 * s)
    doc.rect(right - tw - 2 * pad, custBase + 1.2 * s, tw + 2 * pad, 3.4 * s)
    doc.text(sl, right - pad, custBase + 1.2 * s + 2.5 * s, { align: 'right' })
  }
  doc.setLineWidth(0.15 * s)
  doc.line(x0, y + customerH, right, y + customerH)
  y += customerH + gap

  // Metric rows: label left, value right, hairline dividers
  const rows: [boolean, string, string][] = [
    [options.showDate, 'DATE:', formatDate(label.date)],
    [options.showWeight, 'WEIGHT:', `${formatAmount(label.weight)} g`],
    [options.showRate, 'RATE:', `${formatCurrency(label.rate)}/g`],
  ]
  doc.setLineWidth(0.1 * s)
  rows.forEach(([on, rowLabel, value], rowIndex) => {
    const rowY = y + rowIndex * 3.6 * s
    if (on) {
      write(rowLabel, x0, rowY + 2.6 * s, { size: 7 * s })
      write(value, right, rowY + 2.6 * s, { size: 7.5 * s, bold: true, align: 'right' })
    }
    if (rowIndex < rows.length - 1) {
      doc.line(x0, rowY + 3.6 * s, right, rowY + 3.6 * s)
    }
  })
  y += metricsH + gap

  // Grand total box
  doc.setLineWidth(0.5 * s)
  doc.rect(x0, y, iw, totalH)
  if (options.showAmount) {
    const base = y + totalH / 2 + 3 * s * MM_PER_PT
    write('GRAND TOTAL:', x0 + 1.5 * s, base, { size: 7 * s, bold: true })
    write(formatCurrency(label.amount), right - 1.5 * s, base, {
      size: 11 * s,
      bold: true,
      align: 'right',
    })
  }
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

  // Brand mark (top-left)
  doc.addImage(logoDataUrl, 'PNG', left, A4_MARGIN_MM - 1, 12, 12)

  // Company header (left)
  let y = A4_MARGIN_MM + 14
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
    write(formatAmount(item.weightG), colWeight, y, { size: 8.5, align: 'right' })
    write(formatAmount(item.rate), colRate, y, { size: 8.5, align: 'right' })
    write(formatAmount(item.amount), colAmount, y, { size: 8.5, bold: true, align: 'right' })
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
  write(`${formatAmount(invoice.totalWeight)} g`, right, y, { size: 9, bold: true, align: 'right' })
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
