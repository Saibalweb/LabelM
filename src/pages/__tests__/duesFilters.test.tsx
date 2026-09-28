import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Dues } from '@/pages/dues'
import authReducer from '@/store/slices/authSlice'
import draftReducer, { emptyDraft } from '@/store/slices/draftSlice'
import type { Customer, DueFilters, Invoice } from '@/lib/types'

const hooks = vi.hoisted(() => ({
  useCustomersQuery: vi.fn(),
  useDueInvoicesQuery: vi.fn(),
}))

vi.mock('@/hooks/queries', () => ({
  useCustomersQuery: hooks.useCustomersQuery,
  useDueInvoicesQuery: hooks.useDueInvoicesQuery,
}))

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const customers: Customer[] = [
  {
    id: 1,
    name: 'Acme Trading',
    address: null,
    phone: null,
    email: null,
    gst_number: null,
    currentRate: 42,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Beta Mills',
    address: null,
    phone: null,
    email: null,
    gst_number: null,
    currentRate: 55,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const baseInvoice: Invoice = {
  id: 0,
  invoiceNumber: '',
  customerId: 0,
  customerName: '',
  customerAddress: null,
  customerEmail: null,
  customerPhone: null,
  periodStart: '2026-01-01',
  periodEnd: '2026-02-01',
  billingPeriod: 'Jan 2026',
  period: 'Jan 1, 2026 - Jan 31, 2026',
  totalAmount: 0,
  totalWeight: 0,
  status: 'Unpaid',
  dueDate: '',
  createdAt: '2026-01-15T00:00:00Z',
  paid: 0,
  due: 0,
  companySnapshot: null,
  customerSnapshot: null,
  lineItems: [],
  payments: [],
}

const allInvoices: Invoice[] = [
  {
    ...baseInvoice,
    id: 11,
    invoiceNumber: 'INV-0011',
    customerId: 1,
    customerName: 'Acme Trading',
    totalAmount: 500,
    due: 500,
    status: 'Unpaid',
    dueDate: daysAgoISO(10),
  },
  {
    ...baseInvoice,
    id: 12,
    invoiceNumber: 'INV-0012',
    customerId: 2,
    customerName: 'Beta Mills',
    totalAmount: 1000,
    totalWeight: 0,
    paid: 200,
    due: 800,
    status: 'Partial',
    dueDate: daysAgoISO(70),
  },
]

function renderDues() {
  const store = configureStore({
    reducer: { auth: authReducer, draft: draftReducer },
    preloadedState: {
      auth: {
        session: null,
        profile: null,
        user: { id: 'u1', name: 'Saibal Kole', email: 's@c.com', role: 'owner' },
        status: 'authenticated',
        error: null,
        lastEmail: null,
        bootstrapped: true,
      } as never,
      draft: { draft: emptyDraft },
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dues']}>
        <Routes>
          <Route path="/dues" element={<Dues />} />
          <Route path="/invoice/:id" element={<div>Invoice page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Filters/ }))
  expect(screen.getByRole('heading', { name: 'Filter Dues' })).toBeInTheDocument()
}

function activeChip(): HTMLElement | null {
  return screen.queryByText(/\d+ active/)
}

function quickViewsSection(): HTMLElement {
  return screen.getByText('Quick Views').closest('div') as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useCustomersQuery.mockReturnValue({ data: customers })
  hooks.useDueInvoicesQuery.mockImplementation((filters: DueFilters = {}) => {
    let rows = allInvoices.filter(
      (inv) => inv.status === 'Unpaid' || inv.status === 'Partial'
    )
    if (filters.statuses && filters.statuses.length > 0) {
      rows = rows.filter((inv) => filters.statuses?.includes(inv.status))
    }
    if (filters.customerIds && filters.customerIds.length > 0) {
      rows = rows.filter((inv) => filters.customerIds?.includes(inv.customerId))
    }
    if (filters.from) rows = rows.filter((inv) => (inv.dueDate ?? '') >= (filters.from ?? ''))
    if (filters.to) rows = rows.filter((inv) => (inv.dueDate ?? '') < (filters.to ?? ''))
    return { data: rows, isPending: false, isFetching: false }
  })
})

describe('Dues filter sheet — quick views', () => {
  it('opens the sheet and shows every quick view preset', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)
    const views = quickViewsSection()
    expect(within(views).getByRole('button', { name: /All Dues/ })).toBeInTheDocument()
    expect(within(views).getByRole('button', { name: /Overdue/ })).toBeInTheDocument()
    expect(within(views).getByRole('button', { name: /Due Soon/ })).toBeInTheDocument()
    expect(within(views).getByRole('button', { name: /Due 30\+ Days/ })).toBeInTheDocument()
  })

  it('applies and toggles the overdue quick view', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const preset = within(quickViewsSection()).getByRole('button', { name: /Overdue/ })
    await user.click(preset)
    expect(activeChip()).toHaveTextContent('1 active')

    await user.click(preset)
    expect(activeChip()).not.toBeInTheDocument()
  })

  it('keeps overdue customers when the overdue quick view is active', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    await user.click(within(quickViewsSection()).getByRole('button', { name: /Overdue/ }))
    await user.click(screen.getByRole('button', { name: /Apply Filters/ }))
    expect(screen.getByText('Acme Trading')).toBeInTheDocument()
    expect(screen.getByText('Beta Mills')).toBeInTheDocument()
  })

  it('applies the aging bucket filter', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const agingSection = screen.getByText('Aging').closest('div')?.parentElement as HTMLElement
    await user.click(within(agingSection).getByRole('checkbox', { name: /Overdue 1–30 days/ }))
    expect(activeChip()).toHaveTextContent('1 active')

    await user.click(screen.getByRole('button', { name: /Apply Filters/ }))
    expect(screen.getByText('Acme Trading')).toBeInTheDocument()
    expect(screen.queryByText('Beta Mills')).not.toBeInTheDocument()
  })
})

describe('Dues filter sheet — dimensions', () => {
  it('counts a selected payment status', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const statusSection = screen.getByText('Payment Status').closest('div')?.parentElement as HTMLElement
    await user.click(within(statusSection).getByRole('checkbox', { name: /Partial/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('filters the list by payment status', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const statusSection = screen.getByText('Payment Status').closest('div')?.parentElement as HTMLElement
    await user.click(within(statusSection).getByRole('checkbox', { name: /Partial/ }))
    await user.click(screen.getByRole('button', { name: /Apply Filters/ }))
    expect(screen.queryByText('Acme Trading')).not.toBeInTheDocument()
    expect(screen.getByText('Beta Mills')).toBeInTheDocument()
  })

  it('counts a selected customer', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const customerSection = screen.getByText('Customer & Account').closest('div')?.parentElement as HTMLElement
    await user.click(within(customerSection).getByRole('checkbox', { name: /Acme Trading/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('counts a due amount range once for either bound', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const amountSection = screen.getByText('Due Amount Range').closest('div')?.parentElement as HTMLElement
    await user.type(within(amountSection).getByPlaceholderText('0'), '100')
    expect(activeChip()).toHaveTextContent('1 active')

    await user.type(within(amountSection).getByPlaceholderText('∞'), '900')
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('reveals the custom due-date range inputs', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    await user.click(screen.getByRole('button', { name: /Custom Date Range/ }))
    expect(screen.getByText('From Date')).toBeInTheDocument()
    expect(screen.getByText('To Date')).toBeInTheDocument()
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('counts an overdue due-date window', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    const windowSection = screen.getByText('Due Date Window').closest('div')?.parentElement as HTMLElement
    await user.click(within(windowSection).getByRole('button', { name: /^Overdue$/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })
})

describe('Dues filter sheet — reset all', () => {
  it('clears every filter and the active-count badge', async () => {
    const user = userEvent.setup()
    renderDues()
    await openFilters(user)

    await user.click(within(quickViewsSection()).getByRole('button', { name: /Overdue/ }))
    const agingSection = screen.getByText('Aging').closest('div')?.parentElement as HTMLElement
    await user.click(within(agingSection).getByRole('checkbox', { name: /Overdue 60\+ days/ }))
    expect(activeChip()).toHaveTextContent('2 active')

    await user.click(screen.getByRole('button', { name: /Reset All/ }))
    expect(activeChip()).not.toBeInTheDocument()
  })
})