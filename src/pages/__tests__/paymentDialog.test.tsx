import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentDialog } from '@/pages/invoiceDetails'
import type { InvoicePayment, PaymentMode } from '@/lib/types'

vi.mock('@/hooks/queries', () => ({
  useInvoiceQuery: vi.fn(() => ({ data: undefined, isPending: false })),
  useRecordPayment: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdatePayment: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeletePayment: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

type SaveArgs = {
  amount: number
  date: string
  mode: PaymentMode
  notes: string | null
}

function renderDialog(
  props: {
    open?: boolean
    payment?: InvoicePayment | null
    dueAmount?: number
    onSave?: (payment: SaveArgs) => void
  } = {}
) {
  const onSave = (props.onSave ?? vi.fn()) as ReturnType<typeof vi.fn> & ((payment: SaveArgs) => void)
  const utils = render(
    <PaymentDialog
      open={props.open ?? true}
      onOpenChange={vi.fn()}
      payment={props.payment ?? null}
      dueAmount={props.dueAmount ?? 500}
      onSave={onSave}
    />
  )
  return { onSave, ...utils }
}

describe('PaymentDialog validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an amount above the due amount', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 500 })

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '501')

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))
    expect(screen.getByText(/Amount cannot exceed the due amount/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects a negative amount', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 500 })

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '-10')

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))
    expect(screen.getByText('Enter a valid amount greater than zero.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects a zero amount', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 500 })

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '0')

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))
    expect(screen.getByText('Enter a valid amount greater than zero.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects an empty amount', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 500 })

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))
    expect(screen.getByText('Enter a valid amount greater than zero.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('allows an amount exactly equal to the due amount', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 500 })

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '500')

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, mode: 'bank_transfer' })
      )
    )
  })

  it('saves with the selected payment mode and notes', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 1000 })

    await user.click(screen.getByRole('button', { name: 'UPI' }))
    await user.type(screen.getByLabelText('Notes (Optional)'), 'paid via UPI ref 123')

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '250')

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        amount: 250,
        date: expect.any(String),
        mode: 'upi',
        notes: 'paid via UPI ref 123',
      })
    )
  })

  it('normalises blank notes to null', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({ dueAmount: 100 })

    await user.click(screen.getByRole('button', { name: 'Save Payment' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: null })))
  })
})

describe('PaymentDialog editing mode', () => {
  it('shows edit title and pre-fills the payment', () => {
    renderDialog({
      payment: {
        id: 3,
        amount: 120,
        date: '2026-09-10',
        mode: 'cheque',
        notes: 'cheque 42',
        receivedBy: null,
      },
      dueAmount: 500,
    })
    expect(screen.getByText('Edit Payment')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (₹)')).toHaveValue(120)
  })

  it('raises the allowed maximum for the payment being edited', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({
      payment: {
        id: 3,
        amount: 120,
        date: '2026-09-10',
        mode: 'cheque',
        notes: null,
        receivedBy: null,
      },
      dueAmount: 500,
    })

    // 120 already paid + 500 due = 620 is now acceptable
    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '620')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ amount: 620 })))
  })

  it('rejects an amount above the combined limit while editing', async () => {
    const user = userEvent.setup()
    const { onSave } = renderDialog({
      payment: {
        id: 3,
        amount: 120,
        date: '2026-09-10',
        mode: 'cheque',
        notes: null,
        receivedBy: null,
      },
      dueAmount: 500,
    })

    const amount = screen.getByLabelText('Amount (₹)')
    await user.clear(amount)
    await user.type(amount, '621')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText(/Amount cannot exceed the due amount/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('PaymentDialog modes', () => {
  it('offers every payment mode', () => {
    renderDialog()
    for (const label of ['Cash', 'UPI', 'Bank Transfer', 'Cheque']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })
})