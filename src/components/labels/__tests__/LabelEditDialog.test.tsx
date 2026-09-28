import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LabelEditDialog } from '@/components/labels/LabelEditDialog'
import type { Customer, Label } from '@/lib/types'

const updateLabel = vi.fn()
const mockQueries = vi.hoisted(() => ({
  useCustomersQuery: vi.fn(),
  useUpdateLabel: vi.fn(),
}))

vi.mock('@/hooks/queries', () => ({
  useCustomersQuery: mockQueries.useCustomersQuery,
  useUpdateLabel: mockQueries.useUpdateLabel,
}))

const customers: Customer[] = [
  {
    id: 5,
    name: 'Acme Trading',
    address: null,
    phone: null,
    email: null,
    gst_number: null,
    currentRate: 42,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

function editableLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 1,
    slNo: 'LBL-0001',
    customerId: 5,
    customerName: 'Acme Trading',
    date: '2026-09-24',
    weight: 12.5,
    rate: 42,
    amount: 525,
    status: 'draft',
    invoiceId: null,
    createdAt: '2026-09-24T10:00:00Z',
    ...overrides,
  }
}

function renderDialog(label: Label | null, onOpenChange = vi.fn()) {
  return render(
    <LabelEditDialog open label={label} onOpenChange={onOpenChange} />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQueries.useCustomersQuery.mockReturnValue({ data: customers })
  mockQueries.useUpdateLabel.mockReturnValue({ mutateAsync: updateLabel })
  updateLabel.mockResolvedValue(editableLabel())
})

describe('LabelEditDialog', () => {
  it('renders editable fields and a live amount preview', () => {
    renderDialog(editableLabel())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight (g)')).toHaveValue(12.5)
    expect(screen.getByLabelText('Rate (₹/g)')).toHaveValue(42)
    expect(screen.getByText('₹525.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
  })

  it('locks a billed label and disables saving', () => {
    renderDialog(editableLabel({ invoiceId: 9 }))
    expect(
      screen.getByText('This label is already billed to an invoice and cannot be edited.')
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Weight (g)')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  })

  it('rejects a zero or negative weight', async () => {
    const user = userEvent.setup()
    renderDialog(editableLabel())

    const weight = screen.getByLabelText('Weight (g)')
    await user.clear(weight)
    await user.type(weight, '0')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Enter a valid weight greater than zero.')).toBeInTheDocument()
    expect(updateLabel).not.toHaveBeenCalled()
  })

  it('rejects a negative rate', async () => {
    const user = userEvent.setup()
    renderDialog(editableLabel())

    const rate = screen.getByLabelText('Rate (₹/g)')
    await user.clear(rate)
    await user.type(rate, '-5')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Enter a valid rate.')).toBeInTheDocument()
    expect(updateLabel).not.toHaveBeenCalled()
  })

  it('requires a date', async () => {
    const user = userEvent.setup()
    renderDialog(editableLabel())

    const date = screen.getByLabelText('Date')
    await user.clear(date)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Pick a date.')).toBeInTheDocument()
    expect(updateLabel).not.toHaveBeenCalled()
  })

  it('submits a patch with the changed fields', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(editableLabel(), onOpenChange)

    const weight = screen.getByLabelText('Weight (g)')
    await user.clear(weight)
    await user.type(weight, '10')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateLabel).toHaveBeenCalledWith({ id: 1, patch: { weight: 10 } }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('closes without saving when nothing changed', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(editableLabel(), onOpenChange)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(updateLabel).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('recomputes the preview amount when weight or rate changes', async () => {
    const user = userEvent.setup()
    renderDialog(editableLabel())

    const weight = screen.getByLabelText('Weight (g)')
    await user.clear(weight)
    await user.type(weight, '10')

    expect(screen.getByText('₹420.00')).toBeInTheDocument()

    const rate = screen.getByLabelText('Rate (₹/g)')
    await user.clear(rate)
    await user.type(rate, '50')

    expect(screen.getByText('₹500.00')).toBeInTheDocument()
  })
})