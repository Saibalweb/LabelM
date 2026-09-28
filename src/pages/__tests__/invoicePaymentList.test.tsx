import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Invoice } from '@/lib/types'

const data = vi.hoisted(() => ({
  settings: null as { invoiceOptions: Record<string, boolean> } | null,
  invoice: {
    id: 1,
    invoiceNumber: 'INV-0001',
    customerId: 7,
    customerName: 'Acme Trading',
    customerAddress: null,
    customerEmail: null,
    customerPhone: null,
    periodStart: '2026-09-01',
    periodEnd: '2026-10-01',
    billingPeriod: 'Sep 2026',
    period: 'Sep 1, 2026 - Sep 30, 2026',
    totalAmount: 1000,
    totalWeight: 10,
    status: 'Partial',
    dueDate: '2026-10-15',
    createdAt: '2026-09-20T10:30:00Z',
    paid: 400,
    due: 600,
    companySnapshot: null,
    customerSnapshot: null,
    lineItems: [
      { id: 11, slNo: 'LBL-0001', date: '2026-09-20', weightG: 10, rate: 100, amount: 1000 },
    ],
    payments: [
      {
        id: 1,
        amount: 400,
        date: '2026-09-22',
        mode: 'cash',
        notes: null,
        receivedBy: 'Ada Lovelace',
      },
    ],
  } satisfies Invoice,
}))

vi.mock('@/hooks/queries', () => ({
  useInvoiceQuery: () => ({ data: data.invoice, isPending: false }),
  useRecordPayment: () => ({ mutateAsync: vi.fn() }),
  useUpdatePayment: () => ({ mutateAsync: vi.fn() }),
  useDeletePayment: () => ({ mutateAsync: vi.fn() }),
  useCompanyProfileQuery: () => ({ data: null }),
  useAppSettingsQuery: () => ({ data: data.settings }),
}))

vi.mock('@/store/hooks', () => ({
  useAppSelector: () => 'owner',
}))

vi.mock('@/components/layout/TopNav', () => ({
  TopNav: ({ title }: { title: string }) => <div>{title}</div>,
}))

import { InvoiceDetails } from '@/pages/invoiceDetails'

function renderDetails() {
  return render(
    <MemoryRouter initialEntries={['/invoice/1']}>
      <Routes>
        <Route path="/invoice/:id" element={<InvoiceDetails />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('InvoiceDetails payment history', () => {
  beforeEach(() => {
    data.settings = null
  })

  it('shows the employee who recorded each payment', () => {
    renderDetails()

    expect(screen.getByText('Payment History')).toBeInTheDocument()
    expect(screen.getByText(/by Ada Lovelace/)).toBeInTheDocument()
    expect(screen.getByText(/^Cash/)).toBeInTheDocument()
  })

  it('shows the due date even when the print toggle hides it', () => {
    data.settings = { invoiceOptions: { showDueDate: false } }

    renderDetails()

    expect(screen.getByText('Due Date')).toBeInTheDocument()
    expect(screen.getByText('15 Oct 2026')).toBeInTheDocument()
  })
})
