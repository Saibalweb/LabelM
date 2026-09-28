import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Label } from '@/lib/types'

const pdf = vi.hoisted(() => {
  const save = vi.fn()
  const addPage = vi.fn()
  const setFont = vi.fn()
  const setFontSize = vi.fn()
  const text = vi.fn()
  const getTextDimensions = vi.fn(() => ({ w: 10, h: 3 }))
  const jsPDF = vi.fn(function () {
    return { save, addPage, setFont, setFontSize, text, getTextDimensions }
  })
  return { jsPDF, save, addPage, text }
})

vi.mock('jspdf', () => ({ jsPDF: pdf.jsPDF }))

import { exportLabelPdf, exportLabelsPdf } from '@/lib/labelPdf'

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
