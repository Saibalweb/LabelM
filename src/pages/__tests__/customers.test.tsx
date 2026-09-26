import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { Customers } from '@/pages/customers'
import authReducer from '@/store/slices/authSlice'
import draftReducer, { emptyDraft } from '@/store/slices/draftSlice'
import type { Customer, DeletedCustomer } from '@/lib/types'

const hooks = vi.hoisted(() => ({
  useCustomerListQuery: vi.fn(),
  useAddCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(),
  useDeleteCustomer: vi.fn(),
  useRestoreCustomer: vi.fn(),
  useSetCustomerRate: vi.fn(),
  useDeletedCustomersQuery: vi.fn(),
}))

vi.mock('@/hooks/queries', () => ({
  useCustomerListQuery: hooks.useCustomerListQuery,
  useAddCustomer: hooks.useAddCustomer,
  useUpdateCustomer: hooks.useUpdateCustomer,
  useDeleteCustomer: hooks.useDeleteCustomer,
  useRestoreCustomer: hooks.useRestoreCustomer,
  useSetCustomerRate: hooks.useSetCustomerRate,
  useDeletedCustomersQuery: hooks.useDeletedCustomersQuery,
}))

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const customer: Customer = {
  id: 1,
  name: 'Acme Trading',
  address: null,
  phone: null,
  email: null,
  gst_number: null,
  currentRate: 42,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const deleted: DeletedCustomer = {
  id: 2,
  name: 'Beta Mills',
  address: null,
  phone: null,
  email: null,
  gst_number: null,
  deleted_at: '2026-09-25T10:00:00Z',
  deleted_by: 'u1',
  deleted_by_name: 'Saibal Kole',
}

function mutationMock() {
  return { mutateAsync: vi.fn().mockResolvedValue(undefined) }
}

function renderCustomers(role: 'owner' | 'admin' | 'staff') {
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
      <MemoryRouter initialEntries={['/customers']}>
        <Customers />
      </MemoryRouter>
    </Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useCustomerListQuery.mockReturnValue({ data: { data: [customer], total: 1 }, isPending: false })
  hooks.useAddCustomer.mockReturnValue(mutationMock())
  hooks.useUpdateCustomer.mockReturnValue(mutationMock())
  hooks.useDeleteCustomer.mockReturnValue(mutationMock())
  hooks.useRestoreCustomer.mockReturnValue(mutationMock())
  hooks.useSetCustomerRate.mockReturnValue(mutationMock())
  hooks.useDeletedCustomersQuery.mockReturnValue({ data: [deleted] })
})

describe('Customers page delete gating', () => {
  it('lets owner/admin delete and shows the danger confirmation modal', async () => {
    const user = userEvent.setup()
    renderCustomers('owner')

    await user.click(screen.getByRole('button', { name: 'Actions for Acme Trading' }))
    await user.click(screen.getByRole('button', { name: 'Delete customer' }))

    expect(
      screen.getByRole('heading', { name: 'Delete customer?' })
    ).toBeInTheDocument()
    expect(screen.getByText(/All labels, invoices, payments and unpaid dues/)).toBeInTheDocument()
    expect(screen.getByText(/No data is erased/)).toBeInTheDocument()
    expect(
      screen.getByText(/Only an owner or admin can restore this customer/)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete customer' }))
    expect(hooks.useDeleteCustomer().mutateAsync).toHaveBeenCalledWith(1)
  })

  it('hides the delete action from staff', async () => {
    const user = userEvent.setup()
    renderCustomers('staff')

    await user.click(screen.getByRole('button', { name: 'Actions for Acme Trading' }))

    expect(screen.getByRole('button', { name: 'Edit customer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete customer' })).not.toBeInTheDocument()
  })

  it('shows the deleted-customers admin section with restore for owner/admin', async () => {
    const user = userEvent.setup()
    renderCustomers('admin')

    expect(screen.getByRole('heading', { name: 'Deleted customers' })).toBeInTheDocument()
    expect(screen.getByText('Beta Mills')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(hooks.useRestoreCustomer().mutateAsync).toHaveBeenCalledWith(2)
  })

  it('hides the deleted-customers section from staff', () => {
    renderCustomers('staff')
    expect(screen.queryByRole('heading', { name: 'Deleted customers' })).not.toBeInTheDocument()
  })
})