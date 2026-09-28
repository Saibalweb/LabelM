import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  useBulkMarkPrinted: vi.fn(),
  useCompanyProfileQuery: vi.fn(),
  useAppSettingsQuery: vi.fn(),
}))

vi.mock('@/hooks/queries', () => ({
  useCustomersQuery: hooks.useCustomersQuery,
  useLabelCountsByCustomerQuery: hooks.useLabelCountsByCustomerQuery,
  useLabelsQuery: hooks.useLabelsQuery,
  useLabelStatsQuery: hooks.useLabelStatsQuery,
  useUpdateLabel: hooks.useUpdateLabel,
  useDeleteLabel: hooks.useDeleteLabel,
  useBulkMarkPrinted: hooks.useBulkMarkPrinted,
  useCompanyProfileQuery: hooks.useCompanyProfileQuery,
  useAppSettingsQuery: hooks.useAppSettingsQuery,
}))

const exportLabelsPdf = vi.hoisted(() => vi.fn())
vi.mock('@/lib/documentPdf', () => ({ exportLabelsPdf, exportLabelPdf: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const unbilled: Label = {
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

const billed: Label = {
  ...unbilled,
  id: 2,
  slNo: 'LBL-0002',
  customerName: 'Beta Mills',
  invoiceId: 42,
  status: 'printed',
}

const markPrintedMutate = vi.fn()

function renderDashboard(labels: Label[] = [unbilled, billed]) {
  hooks.useLabelsQuery.mockReturnValue({
    data: { data: labels, total: labels.length },
    isPending: false,
    isFetching: false,
  })

  const store = configureStore({
    reducer: { auth: authReducer, draft: draftReducer },
    preloadedState: {
      auth: {
        session: null,
        profile: null,
        user: { id: 'u1', name: 'Saibal Kole', email: 's@c.com', role: 'admin' },
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

beforeEach(() => {
  vi.clearAllMocks()
  markPrintedMutate.mockReset()
  window.print = vi.fn()
  hooks.useCustomersQuery.mockReturnValue({ data: [] })
  hooks.useLabelCountsByCustomerQuery.mockReturnValue({ data: [] })
  hooks.useLabelStatsQuery.mockReturnValue({
    data: { totalLabels: 2, totalWeight: 10, minWeight: 10, maxWeight: 10, minAmount: 1000, maxAmount: 1000, printQueue: 1 },
  })
  hooks.useUpdateLabel.mockReturnValue({ mutate: vi.fn(), mutateAsync: vi.fn() })
  hooks.useDeleteLabel.mockReturnValue({ mutateAsync: vi.fn() })
  hooks.useBulkMarkPrinted.mockReturnValue({ mutate: markPrintedMutate, mutateAsync: vi.fn() })
  hooks.useCompanyProfileQuery.mockReturnValue({ data: null })
  hooks.useAppSettingsQuery.mockReturnValue({ data: undefined })
})

describe('Dashboard bulk selection', () => {
  it('allows selecting billed labels', () => {
    renderDashboard()
    expect(screen.getByLabelText('Select label LBL-0002')).not.toBeDisabled()
    expect(screen.getByLabelText('Select label LBL-0001')).not.toBeDisabled()
  })

  it('shows the bulk action bar only when rows are selected', async () => {
    const user = userEvent.setup()
    renderDashboard()
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Select label LBL-0001'))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Print 1/ })).toBeInTheDocument()
  })

  it('selects every row via the header checkbox', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Select all labels on this page'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByLabelText('Select label LBL-0002')).toBeChecked()
  })
})

describe('Dashboard bulk actions', () => {
  it('prints selected labels then marks them printed after the print dialog closes', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Select label LBL-0001'))
    await user.click(screen.getByRole('button', { name: /Print 1/ }))

    expect(window.print).toHaveBeenCalledTimes(1)
    expect(document.getElementById('bulkPrintArea')?.textContent).toContain('₹1,000.00')

    window.dispatchEvent(new Event('afterprint'))
    await waitFor(() => expect(markPrintedMutate).toHaveBeenCalledWith([1], expect.anything()))
  })

  it('exports selected labels to PDF without changing status', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Select label LBL-0001'))
    const exportButtons = screen.getAllByRole('button', { name: 'Export PDF' })
    await user.click(exportButtons[exportButtons.length - 1])

    await waitFor(() => expect(exportLabelsPdf).toHaveBeenCalledTimes(1))
    expect(exportLabelsPdf.mock.calls[0][0]).toHaveLength(1)
    expect(markPrintedMutate).not.toHaveBeenCalled()
  })

  it('sends every selected id, including billed labels, to the RPC', async () => {
    const user = userEvent.setup()
    renderDashboard()
    // LBL-0001 = unbilled draft, LBL-0002 = billed + already printed
    await user.click(screen.getByLabelText('Select label LBL-0001'))
    await user.click(screen.getByLabelText('Select label LBL-0002'))
    await user.click(screen.getByRole('button', { name: /Print 2/ }))

    // Server only flips the unbilled draft -> count of 1.
    markPrintedMutate.mockImplementation((_ids, opts) => opts?.onSuccess?.(1))
    window.dispatchEvent(new Event('afterprint'))

    await waitFor(() => expect(markPrintedMutate).toHaveBeenCalledWith([1, 2], expect.anything()))
    await waitFor(() => expect(screen.getByText('1 label marked printed')).toBeInTheDocument())
  })

  it('reports no status change when the selection needed no flip (billed/already printed)', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Select label LBL-0002'))
    await user.click(screen.getByRole('button', { name: /Print 1/ }))

    markPrintedMutate.mockImplementation((_ids, opts) => opts?.onSuccess?.(0))
    window.dispatchEvent(new Event('afterprint'))

    await waitFor(() =>
      expect(screen.getByText('No labels needed a status change')).toBeInTheDocument()
    )
  })

  it('includes billed labels in the export without flipping status', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Select label LBL-0001'))
    await user.click(screen.getByLabelText('Select label LBL-0002'))
    const exportButtons = screen.getAllByRole('button', { name: 'Export PDF' })
    await user.click(exportButtons[exportButtons.length - 1])

    await waitFor(() => expect(exportLabelsPdf).toHaveBeenCalledTimes(1))
    expect(exportLabelsPdf.mock.calls[0][0]).toHaveLength(2)
    expect(markPrintedMutate).not.toHaveBeenCalled()
  })
})
