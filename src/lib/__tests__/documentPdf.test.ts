import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Invoice, Label } from '@/lib/types'

const pdf = vi.hoisted(() => {
  const save = vi.fn()
  const addPage = vi.fn()
  const setFont = vi.fn()
  const setFontSize = vi.fn()
  const text = vi.fn()
  const setDrawColor = vi.fn()
  const setLineWidth = vi.fn()
  const line = vi.fn()
  const getTextDimensions = vi.fn(() => ({ w: 10, h: 3 }))
  const jsPDF = vi.fn(function () {
    return {
      save,
      addPage,
      setFont,
      setFontSize,
      text,
      setDrawColor,
      setLineWidth,
      line,
      getTextDimensions,
    }
  })
  return { jsPDF, save, addPage, text }
})

vi.mock('jspdf', () => ({ jsPDF: pdf.jsPDF }))

import { exportInvoicePdf, exportInvoicesPdf, exportLabelPdf, exportLabelsPdf } from '@/lib/documentPdf'

const label: Label = {
  id: 1,
  slNo: 'LBL-0001',
  customerId: 7,
  customerName: 'Acme Trading',
  date: '2026-09-20',
  weight: 10,
  rate: 100,
  amount: 1000,
  status: 'draft',
  invoiceId: null,
  createdAt: '2026-09-20T10:30:00Z',
}

const invoice: Invoice = {
  id: 1,
  invoiceNumber: 'INV-0001',
  customerId: 7,
  customerName: 'Acme Trading',
  customerAddress: '12 Market Road\nPune',
  customerEmail: 'acme@example.com',
  customerPhone: '9999999999',
  periodStart: '2026-09-01',
  periodEnd: '2026-10-01',
  billingPeriod: 'Sep 2026',
  period: 'Sep 1, 2026 - Sep 30, 2026',
  totalAmount: 1000,
  totalWeight: 10,
  status: 'Unpaid',
  dueDate: '2026-10-15',
  createdAt: '2026-09-20T10:30:00Z',
  paid: 0,
  due: 1000,
  companySnapshot: null,
  customerSnapshot: null,
  lineItems: [
    { id: 11, slNo: 'LBL-0001', date: '2026-09-20', weightKg: 10, rate: 100, amount: 1000 },
  ],
  payments: [],
}

const company = {
  companyName: 'Maira 3D Cam',
  tagline: 'Precision parts',
  address: 'Plot 5, Pune',
  contactPerson: 'Sai',
  phones: [{ id: '1', label: 'Sales', value: '8888888888', showOnLabel: false, showOnInvoice: true }],
  email: 'hello@maira.example',
  website: 'maira.example',
  gstNumber: '27ABCDE1234F1Z5',
  logoUrl: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportLabelsPdf', () => {
  it('does nothing for an empty list', async () => {
    await exportLabelsPdf([])
    expect(pdf.jsPDF).not.toHaveBeenCalled()
  })

  it('renders one page per label at the default size', async () => {
    await exportLabelsPdf([label, { ...label, id: 2, slNo: 'LBL-0002' }])

    expect(pdf.jsPDF).toHaveBeenCalledWith({
      unit: 'mm',
      format: [60, 40],
      orientation: 'landscape',
    })
    // one addPage for the second label
    expect(pdf.addPage).toHaveBeenCalledTimes(1)
    expect(pdf.save).toHaveBeenCalledWith(expect.stringMatching(/^labels-2-\d{4}-\d{2}-\d{2}\.pdf$/))
  })

  it('uses the configured size and orientation', async () => {
    await exportLabelsPdf([label], { widthMm: 100, heightMm: 150 })
    expect(pdf.jsPDF).toHaveBeenCalledWith({
      unit: 'mm',
      format: [100, 150],
      orientation: 'portrait',
    })
  })

  it('replaces the rupee sign with a PDF-safe ASCII equivalent', async () => {
    await exportLabelsPdf([label])
    const rendered = pdf.text.mock.calls.map((call) => call[0] as string)
    expect(rendered).toContain('AMOUNT - Rs 1,000.00')
    expect(rendered.some((line) => line.includes('₹'))).toBe(false)
  })

  it('omits disabled fields from the rendered text', async () => {
    await exportLabelsPdf([label], {
      options: {
        showCompanyName: false,
        showCustomerName: true,
        showSlNo: false,
        showDate: true,
        showWeight: true,
        showAmount: true,
        showRate: false,
        showPhone: false,
        showAddress: false,
      },
      company: { companyName: 'Maira 3D Cam', phones: [], tagline: null, address: null, contactPerson: null, email: null, website: null, gstNumber: null, logoUrl: null },
    })

    const rendered = pdf.text.mock.calls.map((call) => call[0] as string)
    expect(rendered).toContain('Acme Trading'.toUpperCase())
    expect(rendered.some((line) => line.includes('Maira 3D Cam'))).toBe(false)
    expect(rendered.some((line) => line.includes('SL No'))).toBe(false)
  })
})

describe('exportLabelPdf', () => {
  it('names a single-label file after its SL number', async () => {
    await exportLabelPdf(label)
    expect(pdf.save).toHaveBeenCalledWith('label-LBL-0001.pdf')
  })
})

describe('exportInvoicesPdf', () => {
  it('does nothing for an empty list', async () => {
    await exportInvoicesPdf([])
    expect(pdf.jsPDF).not.toHaveBeenCalled()
  })

  it('renders A4 portrait with one page per invoice', async () => {
    await exportInvoicesPdf([invoice, { ...invoice, id: 2, invoiceNumber: 'INV-0002' }])

    expect(pdf.jsPDF).toHaveBeenCalledWith({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    })
    expect(pdf.addPage).toHaveBeenCalledTimes(1)
    expect(pdf.save).toHaveBeenCalledWith(
      expect.stringMatching(/^invoices-2-\d{4}-\d{2}-\d{2}\.pdf$/)
    )
  })

  it('renders the invoice number, customer, line items and totals', async () => {
    await exportInvoicesPdf([invoice], { company })

    const rendered = pdf.text.mock.calls.map((call) => call[0] as string)
    expect(rendered).toContain('#INV-0001')
    expect(rendered).toContain('Acme Trading')
    expect(rendered).toContain('LBL-0001')
    expect(rendered).toContain('Total')
  })

  it('replaces the rupee sign with a PDF-safe ASCII equivalent', async () => {
    await exportInvoicesPdf([invoice], { company })
    const rendered = pdf.text.mock.calls.map((call) => call[0] as string)
    expect(rendered).toContain('Rs 1,000.00')
    expect(rendered.some((line) => line.includes('₹'))).toBe(false)
  })

  it('honours the invoice option toggles', async () => {
    await exportInvoicesPdf([invoice], {
      company,
      options: {
        showTagline: false,
        showAddress: false,
        showGst: false,
        showPhones: false,
        showEmail: false,
        showWebsite: false,
        showContactPerson: false,
        showDueDate: false,
      },
    })

    const rendered = pdf.text.mock.calls.map((call) => call[0] as string)
    expect(rendered.some((line) => line.includes('GSTIN'))).toBe(false)
    expect(rendered.some((line) => line.includes('Due Date:'))).toBe(false)
    expect(rendered.some((line) => line.includes('Precision parts'))).toBe(false)
  })

  it('paginates when the line items overflow the page', async () => {
    const manyItems = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      slNo: `LBL-${i + 1}`,
      date: '2026-09-20',
      weightKg: 1,
      rate: 100,
      amount: 100,
    }))
    await exportInvoicesPdf([{ ...invoice, lineItems: manyItems }], { company })
    expect(pdf.addPage).toHaveBeenCalled()
  })
})

describe('exportInvoicePdf', () => {
  it('names a single-invoice file after its number', async () => {
    await exportInvoicePdf(invoice, { company })
    expect(pdf.save).toHaveBeenCalledWith('invoice-INV-0001.pdf')
  })

  it('sanitizes path-unsafe characters in the filename', async () => {
    await exportInvoicePdf({ ...invoice, invoiceNumber: 'INV/2026/01' }, { company })
    expect(pdf.save).toHaveBeenCalledWith('invoice-INV-2026-01.pdf')
  })
})
