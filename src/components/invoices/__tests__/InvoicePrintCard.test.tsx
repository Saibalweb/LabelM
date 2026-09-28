import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvoicePrintCard } from '@/components/invoices/InvoicePrintCard'
import { DEFAULT_INVOICE_OPTIONS } from '@/lib/documentOptions'
import type { CompanyProfile, Invoice } from '@/lib/types'

const invoice: Invoice = {
  id: 1,
  invoiceNumber: 'INV-0042',
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
    { id: 11, slNo: 'LBL-0001', date: '2026-09-20', weightG: 10, rate: 100, amount: 1000 },
  ],
  payments: [],
}

const company: CompanyProfile = {
  companyName: 'Maira 3D Cam',
  tagline: 'Direct Castable',
  address: '136 Tarak Pramanick Road, Kolkata',
  contactPerson: 'Kadir Ali',
  phones: [
    { id: 'office', label: 'Office', value: '9831410835', showOnLabel: true, showOnInvoice: true },
  ],
  email: 'maira3dcam78@gmail.com',
  website: null,
  gstNumber: '19ABCDE1234F1Z5',
  logoUrl: null,
}

describe('InvoicePrintCard', () => {
  it('renders the default invoice content', () => {
    render(<InvoicePrintCard invoice={invoice} company={company} />)
    expect(screen.getByText('Maira 3D Cam')).toBeInTheDocument()
    expect(screen.getByText('#INV-0042')).toBeInTheDocument()
    expect(screen.getByText('Acme Trading')).toBeInTheDocument()
    expect(screen.getByText('LBL-0001')).toBeInTheDocument()
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument()
    expect(screen.getByText('GSTIN: 19ABCDE1234F1Z5')).toBeInTheDocument()
  })

  it('hides company fields disabled in invoice options', () => {
    render(
      <InvoicePrintCard
        invoice={invoice}
        company={company}
        options={{
          ...DEFAULT_INVOICE_OPTIONS,
          showTagline: false,
          showGst: false,
          showDueDate: false,
        }}
      />
    )
    expect(screen.queryByText('Direct Castable')).not.toBeInTheDocument()
    expect(screen.queryByText(/GSTIN/)).not.toBeInTheDocument()
    expect(screen.queryByText('Due Date:')).not.toBeInTheDocument()
  })

  it('prefers the customer snapshot when present', () => {
    render(
      <InvoicePrintCard
        invoice={{
          ...invoice,
          customerName: 'Joined Row Name',
          customerSnapshot: {
            name: 'Snapshot Name',
            address: null,
            email: null,
            phone: null,
            gstNumber: null,
          },
        }}
        company={company}
      />
    )
    expect(screen.getByText('Snapshot Name')).toBeInTheDocument()
    expect(screen.queryByText('Joined Row Name')).not.toBeInTheDocument()
  })
})
