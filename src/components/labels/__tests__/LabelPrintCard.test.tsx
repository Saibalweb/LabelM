import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LabelPrintCard } from '@/components/labels/LabelPrintCard'
import { DEFAULT_LABEL_OPTIONS } from '@/lib/documentOptions'
import type { CompanyProfile, Label } from '@/lib/types'

const label: Label = {
  id: 1,
  slNo: 'LBL-0127',
  customerId: 7,
  customerName: 'Bapi Da Enterprise',
  date: '2026-09-25',
  weight: 5,
  rate: 100,
  amount: 12500,
  status: 'draft',
  invoiceId: null,
  createdAt: '2026-09-25T10:30:00Z',
}

const company: CompanyProfile = {
  companyName: 'Maira 3D Cam',
  tagline: 'Direct Castable',
  address: '136 Tarak Pramanick Road, Kolkata',
  contactPerson: 'Kadir Ali',
  phones: [
    { id: 'owner', label: 'Owner', value: '9543166067', showOnLabel: false, showOnInvoice: true },
    { id: 'office', label: 'Office', value: '9831410835', showOnLabel: true, showOnInvoice: true },
  ],
  email: 'maira3dcam78@gmail.com',
  website: null,
  gstNumber: '19ABCDE1234F1Z5',
  logoUrl: null,
}

describe('LabelPrintCard', () => {
  it('renders the default field set', () => {
    render(<LabelPrintCard label={label} company={company} />)
    expect(screen.getByText('Maira 3D Cam')).toBeInTheDocument()
    expect(screen.getByText('Bapi Da Enterprise')).toBeInTheDocument()
    expect(screen.getByText('SL No: LBL-0127')).toBeInTheDocument()
    expect(screen.getByText('₹12,500.00')).toBeInTheDocument()
    // rate / phone / address are off by default
    expect(screen.queryByText('RATE -')).not.toBeInTheDocument()
    expect(screen.queryByText('9543166067')).not.toBeInTheDocument()
    expect(screen.queryByText('9831410835')).not.toBeInTheDocument()
    expect(screen.queryByText(/Tarak Pramanick/)).not.toBeInTheDocument()
  })

  it('hides fields disabled in label options', () => {
    render(
      <LabelPrintCard
        label={label}
        company={company}
        options={{ ...DEFAULT_LABEL_OPTIONS, showCompanyName: false, showSlNo: false, showAmount: false }}
      />
    )
    expect(screen.queryByText('Maira 3D Cam')).not.toBeInTheDocument()
    expect(screen.queryByText('SL No: LBL-0127')).not.toBeInTheDocument()
    expect(screen.queryByText('₹12,500.00')).not.toBeInTheDocument()
    expect(screen.getByText('Bapi Da Enterprise')).toBeInTheDocument()
  })

  it('renders only the phone flagged for the label', () => {
    render(
      <LabelPrintCard label={label} company={company} options={{ ...DEFAULT_LABEL_OPTIONS, showPhone: true }} />
    )
    expect(screen.getByText('9831410835')).toBeInTheDocument()
    expect(screen.queryByText('9543166067')).not.toBeInTheDocument()
  })

  it('renders the company address when enabled', () => {
    render(
      <LabelPrintCard label={label} company={company} options={{ ...DEFAULT_LABEL_OPTIONS, showAddress: true }} />
    )
    expect(screen.getByText(/Tarak Pramanick/)).toBeInTheDocument()
  })

  it('falls back to a walk-in customer and default company name', () => {
    render(<LabelPrintCard label={{ ...label, customerName: null }} />)
    expect(screen.getByText('Walk-in Customer')).toBeInTheDocument()
    expect(screen.getByText('My Company')).toBeInTheDocument()
  })
})
