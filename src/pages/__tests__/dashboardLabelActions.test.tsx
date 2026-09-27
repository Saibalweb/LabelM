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
import type { Label } from '@/lib/types'

const hooks = vi.hoisted(() => ({
  useCustomersQuery: vi.fn(),
  useLabelCountsByCustomerQuery: vi.fn(),
  useLabelsQuery: vi.fn(),
  useLabelStatsQuery: vi.fn(),
  useUpdateLabel: vi.fn(),
  useDeleteLabel: vi.fn(),
}))

vi.mock('@/hooks/queries', () => ({
  useCustomersQuery: hooks.useCustomersQuery,
  useLabelCountsByCustomerQuery: hooks.useLabelCountsByCustomerQuery,
  useLabelsQuery: hooks.useLabelsQuery,
  useLabelStatsQuery: hooks.useLabelStatsQuery,
  useUpdateLabel: hooks.useUpdateLabel,
  useDeleteLabel: hooks.useDeleteLabel,
}))

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const baseLabel: Label = {
  id: 1,
  slNo: 'LBL-0001',
  customerId: 7,
  customerName: 'Acme Trading',
  date: '2026-09-20',
  weight: 10,
  rate: 100,
  amount: 1000,
  status: 'printed',
  invoiceId: null,
  createdAt: '2026-09-20T10:30:00Z',
}

const deleteMutateAsync = vi.fn()

function renderDashboard(role: 'owner' | 'admin' | 'staff', label: Label) {
  hooks.useLabelsQuery.mockReturnValue({
    data: { data: [label], total: 1 },
    isPending: false,
    isFetching: false,
  })

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
          <Route path="/preview/:id" element={<div>Preview page</div>} />
          <Route path="/create" element={<div>Create page</div>} />
        </Routes>
      </MemoryRouter>
      <Toaster position="top-center" />
    </Provider>
  )
}

async function openRowMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Label actions' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useCustomersQuery.mockReturnValue({ data: [] })
  hooks.useLabelCountsByCustomerQuery.mockReturnValue({ data: [] })
  hooks.useLabelStatsQuery.mockReturnValue({
    data: { totalLabels: 1, totalWeight: 10, minWeight: 10, maxWeight: 10, minAmount: 1000, maxAmount: 1000, printQueue: 0 },
  })
  hooks.useUpdateLabel.mockReturnValue({ mutate: vi.fn(), mutateAsync: vi.fn() })
  hooks.useDeleteLabel.mockReturnValue({ mutateAsync: deleteMutateAsync })
})

describe('Dashboard label row — layout', () => {
  it('shows the customer id inside the avatar and billed status', () => {
    renderDashboard('admin', baseLabel)
    expect(screen.getByText('Unbilled')).toBeInTheDocument()
    const avatar = screen.getByText('#7')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveClass('bg-tertiary-container')
    expect(screen.getByText('Acme Trading')).toBeInTheDocument()
  })

  it('colors the avatar by billed status', () => {
    renderDashboard('owner', { ...baseLabel, invoiceId: 42 })
    const avatar = screen.getByText('#7')
    expect(avatar).toHaveClass('bg-secondary-container')
  })

  it('keeps print and actions buttons always visible (no hover-hide)', () => {
    renderDashboard('admin', baseLabel)
    const print = screen.getByRole('button', { name: 'Print Label' })
    const menu = screen.getByRole('button', { name: 'Label actions' })
    expect(print).toBeInTheDocument()
    expect(menu).toBeInTheDocument()
    expect(print.parentElement).not.toHaveClass('lg:opacity-0')
  })

  it('drops the eye/view button and keeps print + actions menu', () => {
    renderDashboard('admin', baseLabel)
    expect(screen.getByRole('button', { name: 'Print Label' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Label actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View Details' })).not.toBeInTheDocument()
  })

  it('handles a very long customer name and a large amount without breaking', () => {
    renderDashboard('admin', {
      ...baseLabel,
      customerName: 'Shree Balaji Agro Industries and Cold Storage Private Limited',
      rate: 1234.56,
      amount: 12345678.9,
    })
    const name = screen.getByText(/Shree Balaji Agro/)
    expect(name).toBeInTheDocument()
    expect(name).toHaveClass('truncate')
    expect(screen.getByText('₹1,23,45,678.90')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print Label' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Label actions' })).toBeInTheDocument()
  })
})

describe('Dashboard label row — actions menu', () => {
  it('offers edit and delete for an unbilled label', async () => {
    const user = userEvent.setup()
    renderDashboard('admin', baseLabel)
    await openRowMenu(user)
    expect(await screen.findByRole('menuitem', { name: /Edit Label/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Delete Label/ })).toBeInTheDocument()
  })

  it('shows a locked menu item for a billed label', async () => {
    const user = userEvent.setup()
    renderDashboard('owner', { ...baseLabel, invoiceId: 42 })
    expect(screen.getByText('Billed')).toBeInTheDocument()
    await openRowMenu(user)
    expect(await screen.findByText('Invoiced — Locked')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Delete Label/ })).not.toBeInTheDocument()
  })

  it('lets staff edit and delete an unbilled label', async () => {
    const user = userEvent.setup()
    renderDashboard('staff', baseLabel)
    expect(screen.getByText('Unbilled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print Label' })).toBeInTheDocument()
    await openRowMenu(user)
    expect(await screen.findByRole('menuitem', { name: /Edit Label/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Delete Label/ })).toBeInTheDocument()
  })

  it('shows staff a locked menu for a billed label', async () => {
    const user = userEvent.setup()
    renderDashboard('staff', { ...baseLabel, invoiceId: 42 })
    await openRowMenu(user)
    expect(await screen.findByText('Invoiced — Locked')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Delete Label/ })).not.toBeInTheDocument()
  })

  it('confirms and deletes an unbilled label', async () => {
    const user = userEvent.setup()
    renderDashboard('owner', baseLabel)
    await openRowMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Delete Label/ }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Delete label LBL-0001?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete Label' }))

    expect(deleteMutateAsync).toHaveBeenCalledWith(1)
  })
})

describe('Dashboard label row — direct print', () => {
  it('prints the label from the row print icon', async () => {
    const user = userEvent.setup()
    const printSpy = vi.fn()
    window.print = printSpy
    renderDashboard('owner', baseLabel)

    await user.click(screen.getByRole('button', { name: 'Print Label' }))

    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.getElementById('printLabel')?.textContent).toContain('₹1,000.00')
  })
})
