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
  it('renders the default field set at 50x50mm', () => {
    render(<LabelPrintCard label={label} company={company} widthMm={50} heightMm={50} />)
    expect(screen.getByText(/Maira 3D Cam/i)).toBeVisible()
    expect(screen.getByText(/Bapi Da Enterprise/i)).toBeVisible()
    expect(screen.getByText('LBL-0127')).toBeVisible()
    expect(screen.getByText('₹12,500.00')).toBeVisible()
    // rate / phone / address are off by default: they keep their slot hidden
    expect(screen.getByText(/RATE:/i)).not.toBeVisible()
    expect(screen.queryByText('9543166067')).not.toBeInTheDocument()
    expect(screen.getByText(/TEL: 9831410835/i)).not.toBeVisible()
    expect(screen.getByText(/Tarak Pramanick/i)).not.toBeVisible()
  })

  it('hides fields disabled in label options', () => {
    render(
      <LabelPrintCard
        label={label}
        company={company}
        options={{ ...DEFAULT_LABEL_OPTIONS, showCompanyName: false, showSlNo: false, showAmount: false }}
        widthMm={50}
        heightMm={50}
      />
    )
    expect(screen.getByText(/Maira 3D Cam/i)).not.toBeVisible()
    expect(screen.getByText('LBL-0127')).not.toBeVisible()
    expect(screen.getByText('₹12,500.00')).not.toBeVisible()
    expect(screen.getByText(/Bapi Da Enterprise/i)).toBeVisible()
  })

  it('renders only the phone flagged for the label', () => {
    render(
      <LabelPrintCard
        label={label}
        company={company}
        options={{ ...DEFAULT_LABEL_OPTIONS, showPhone: true }}
        widthMm={50}
        heightMm={50}
      />
    )
    expect(screen.getByText(/TEL: 9831410835/i)).toBeVisible()
    expect(screen.queryByText('9543166067')).not.toBeInTheDocument()
  })

  it('renders the company address when enabled', () => {
    render(
      <LabelPrintCard
        label={label}
        company={company}
        options={{ ...DEFAULT_LABEL_OPTIONS, showAddress: true }}
        widthMm={50}
        heightMm={50}
      />
    )
    expect(screen.getByText(/Tarak Pramanick/i)).toBeVisible()
  })

  it('uses the two-column layout for landscape labels', () => {
    const { container } = render(
      <LabelPrintCard label={label} company={company} widthMm={100} heightMm={50} />
    )
    expect(container.querySelector('.divide-x-2')).not.toBeNull()
  })

  it('falls back to a walk-in customer and default company name', () => {
    render(<LabelPrintCard label={{ ...label, customerName: null }} widthMm={50} heightMm={50} />)
    expect(screen.getByText(/Walk-in Customer/i)).toBeVisible()
    expect(screen.getByText(/My Company/i)).toBeVisible()
  })
})