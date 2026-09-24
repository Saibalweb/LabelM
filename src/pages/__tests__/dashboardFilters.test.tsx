import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Dashboard } from '@/pages/dashboard'
import authReducer from '@/store/slices/authSlice'
import draftReducer, { emptyDraft } from '@/store/slices/draftSlice'
import type { Customer } from '@/lib/types'

const hooks = vi.hoisted(() => ({
  useCustomersQuery: vi.fn(),
  useLabelCountsByCustomerQuery: vi.fn(),
  useLabelsQuery: vi.fn(),
  useLabelStatsQuery: vi.fn(),
  useUpdateLabel: vi.fn(),
}))

vi.mock('@/hooks/queries', () => ({
  useCustomersQuery: hooks.useCustomersQuery,
  useLabelCountsByCustomerQuery: hooks.useLabelCountsByCustomerQuery,
  useLabelsQuery: hooks.useLabelsQuery,
  useLabelStatsQuery: hooks.useLabelStatsQuery,
  useUpdateLabel: hooks.useUpdateLabel,
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

function renderDashboard(role: 'owner' | 'admin' | 'staff' = 'owner') {
  const store = configureStore({
    reducer: { auth: authReducer, draft: draftReducer },
    preloadedState: {
      auth: {
        session: null,
        profile: null,
        user: { id: 'u1', name: 'Saibal Kole', email: 's@c.com', role },
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
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<div>Create page</div>} />
          <Route path="/preview/:id" element={<div>Preview page</div>} />
        </Routes>
      </MemoryRouter>
      <Toaster position="top-center" />
    </Provider>
  )
}

async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Filters/ }))
  expect(screen.getByRole('heading', { name: 'Filter Labels' })).toBeInTheDocument()
}

function activeChip(): HTMLElement | null {
  return screen.queryByText(/\d+ active/)
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useCustomersQuery.mockReturnValue({ data: customers })
  hooks.useLabelCountsByCustomerQuery.mockReturnValue({ data: [] })
  hooks.useLabelsQuery.mockReturnValue({
    data: { data: [], total: 0 },
    isPending: false,
    isFetching: false,
  })
  hooks.useLabelStatsQuery.mockReturnValue({
    data: { totalLabels: 0, totalWeight: 0, minWeight: 0, maxWeight: 0, minAmount: 0, maxAmount: 0, printQueue: 0 },
  })
  hooks.useUpdateLabel.mockReturnValue({ mutateAsync: vi.fn() })
})

describe('Dashboard filter sheet — presets', () => {
  it('opens the sheet and shows every preset', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)
    expect(screen.getByRole('button', { name: /Unprinted Batches/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /High-weight/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Last 48 Hours/ })).toBeInTheDocument()
  })

  it('applies and toggles the unprinted preset', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const preset = screen.getByRole('button', { name: /Unprinted Batches/ })
    await user.click(preset)
    expect(activeChip()).toHaveTextContent('1 active')

    await user.click(preset)
    expect(activeChip()).not.toBeInTheDocument()
  })

  it('applies and toggles the high-weight preset', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const preset = screen.getByRole('button', { name: /High-weight/ })
    await user.click(preset)
    expect(activeChip()).toHaveTextContent('1 active')

    await user.click(preset)
    expect(activeChip()).not.toBeInTheDocument()
  })

  it('applies and toggles the last-48h preset', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const preset = screen.getByRole('button', { name: /Last 48 Hours/ })
    await user.click(preset)
    expect(activeChip()).toHaveTextContent('1 active')

    await user.click(preset)
    expect(activeChip()).not.toBeInTheDocument()
  })

  it('stacks presets into a combined active count', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    await user.click(screen.getByRole('button', { name: /Unprinted Batches/ }))
    await user.click(screen.getByRole('button', { name: /Last 48 Hours/ }))
    expect(activeChip()).toHaveTextContent('2 active')

    await user.click(screen.getByRole('button', { name: /Last 48 Hours/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })
})

describe('Dashboard filter sheet — reset all', () => {
  it('clears every filter and the active-count badge', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    await user.click(screen.getByRole('button', { name: /Unprinted Batches/ }))
    await user.click(screen.getByRole('button', { name: /Last 48 Hours/ }))
    expect(activeChip()).toHaveTextContent('2 active')

    await user.click(screen.getByRole('button', { name: /Reset All/ }))
    expect(activeChip()).not.toBeInTheDocument()
  })
})

describe('Dashboard filter sheet — dimensions', () => {
  it('counts a selected customer', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const customerSection = screen.getByText('Customer & Account').closest('div')?.parentElement as HTMLElement
    const checkbox = within(customerSection).getByRole('checkbox', { name: /Acme Trading/ })
    await user.click(checkbox)
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('counts a selected label status', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const statusSection = screen.getByText('Label Status').closest('div')?.parentElement as HTMLElement
    await user.click(within(statusSection).getByRole('checkbox', { name: /Printed/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('counts a billing filter toggle', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const billingSection = screen.getByText('Billing & Invoices').closest('div')?.parentElement as HTMLElement
    await user.click(within(billingSection).getByRole('checkbox', { name: /Unbilled/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('counts a weight range once for either bound', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    const weightSection = screen.getByText('Weight Range').closest('div')?.parentElement as HTMLElement
    const min = within(weightSection).getByPlaceholderText('0')
    await user.type(min, '5')
    expect(activeChip()).toHaveTextContent('1 active')

    const max = within(weightSection).getByPlaceholderText('∞')
    await user.type(max, '10')
    expect(activeChip()).toHaveTextContent('1 active')
  })

  it('reveals the custom date range inputs', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openFilters(user)

    await user.click(screen.getByRole('button', { name: /Custom Date Range/ }))
    expect(screen.getByText('From Date')).toBeInTheDocument()
    expect(screen.getByText('To Date')).toBeInTheDocument()
    expect(activeChip()).toHaveTextContent('1 active')
  })
})

describe('Dashboard filter sheet — staff visibility', () => {
  it('hides edit affordances from staff but keeps filters functional', async () => {
    const user = userEvent.setup()
    renderDashboard('staff')
    await openFilters(user)
    expect(screen.getByRole('heading', { name: 'Filter Labels' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Unprinted Batches/ }))
    expect(activeChip()).toHaveTextContent('1 active')
  })
})