import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppSelector } from '@/store/hooks'
import {
  useDeletePayment,
  useInvoiceQuery,
  useRecordPayment,
  useUpdatePayment,
} from '@/hooks/queries'
import type { InvoicePayment, InvoiceStatus, PaymentMode } from '@/lib/types'
import { formatCurrency, formatDate, todayInputValue } from '@/lib/format'
import { cn } from '@/lib/utils'

const statusPillStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-secondary-container text-on-secondary-container',
  Unpaid: 'bg-destructive/10 text-destructive',
  Partial: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-left font-label-md text-label-md text-on-surface-variant">
        {label}
      </span>
      <span className="text-right font-label-md text-label-md font-bold text-on-surface">
        {value}
      </span>
    </>
  )
}

function toAmount(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const paymentModes: { label: string; value: PaymentMode }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
]

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: InvoicePayment | null
  dueAmount: number
  onSave: (payment: {
    amount: number
    date: string
    mode: PaymentMode
    notes: string | null
  }) => void
}

// Payment flow checklist & requirements live in checklist/duesChecklist.md
// (payment UX: default date/mode, max-amount clamp, "pay full remaining").
export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  dueAmount,
  onSave,
}: PaymentDialogProps) {
  const isEditing = payment != null
  const maxAmount = dueAmount + (payment?.amount ?? 0)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayInputValue())
  const [mode, setMode] = useState<PaymentMode>('cash')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [fullAmount, setFullAmount] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(payment ? String(payment.amount) : '')
    setDate(payment?.date ?? todayInputValue())
    setMode(payment?.mode ?? 'cash')
    setNotes(payment?.notes ?? '')
    setError('')
    setFullAmount(false)
  }, [open, payment, dueAmount])

  const handleSave = () => {
    const value = Number(amount)
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (value > maxAmount) {
      setError(`Amount cannot exceed the due amount of ${formatCurrency(maxAmount)}.`)
      return
    }
    onSave({
      amount: value,
      date,
      mode,
      notes: notes.trim() || null,
    })
    onOpenChange(false)
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="payment-amount">Amount (₹)</Label>
            <Input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min={0}
              max={maxAmount}
              step="0.01"
              value={amount}
              disabled={fullAmount}
              onChange={(e) => {
                setAmount(e.target.value)
                setFullAmount(false)
                setError('')
              }}
              className="h-11 px-4 text-base"
              autoFocus
            />
            {!isEditing ? (
              <label className="flex cursor-pointer items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={fullAmount}
                  onChange={(e) => {
                    setFullAmount(e.target.checked)
                    if (e.target.checked) {
                      setAmount(String(maxAmount))
                      setError('')
                    }
                  }}
                  className="size-4 accent-primary"
                />
                <span>
                  Pay full remaining amount —{' '}
                  <span className="font-semibold text-primary">{formatCurrency(maxAmount)}</span>
                </span>
              </label>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 px-4 text-base"
            />
          </div>

          <div className="grid gap-2">
            <Label>Payment Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentModes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMode(item.value)}
                  className={cn(
                    'h-10 rounded-lg border font-label-sm text-label-sm transition-colors',
                    mode === item.value
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant hover:bg-surface-container-low'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment-notes">Notes (Optional)</Label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes..."
              className="min-h-[100px] w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InvoiceDetails() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const { data: invoice, isPending: loading } = useInvoiceQuery(
    Number.isFinite(invoiceId) ? invoiceId : undefined
  )
  const recordPayment = useRecordPayment()
  const updatePayment = useUpdatePayment()
  const deletePayment = useDeletePayment()
  const role = useAppSelector((state) => state.auth.user?.role)
  const canManagePayments = role === 'owner' || role === 'admin'

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<InvoicePayment | null>(null)
  const [menuFor, setMenuFor] = useState<InvoicePayment | null>(null)
  const [deleteFor, setDeleteFor] = useState<InvoicePayment | null>(null)

  const handleRecordPayment = async (payment: {
    amount: number
    date: string
    mode: PaymentMode
    notes: string | null
  }) => {
    if (!invoice) return
    try {
      await recordPayment.mutateAsync({
        invoiceId: invoice.id,
        payment: {
          amount: payment.amount,
          date: payment.date,
          mode: payment.mode,
          notes: payment.notes,
        },
      })
      toast.success('Payment recorded')
    } catch {
      toast.error('Failed to record payment.')
    }
  }

  const handleEditPayment = async (payment: {
    amount: number
    date: string
    mode: PaymentMode
    notes: string | null
  }) => {
    if (!invoice || !editingPayment) return
    try {
      await updatePayment.mutateAsync({
        invoiceId: invoice.id,
        paymentId: editingPayment.id,
        payment: {
          amount: payment.amount,
          date: payment.date,
          mode: payment.mode,
          notes: payment.notes,
        },
      })
      toast.success('Payment updated')
    } catch {
      toast.error('Failed to update payment.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!invoice || !deleteFor) return
    try {
      await deletePayment.mutateAsync({
        invoiceId: invoice.id,
        paymentId: deleteFor.id,
      })
      toast.success('Payment deleted')
      setDeleteFor(null)
    } catch {
      toast.error('Failed to delete payment.')
    }
  }

  if (!invoice) {
    return (
      <div className="flex h-full flex-col">
        <TopNav title="Invoice Details" backTo="/invoice" />
        <main className="flex flex-1 items-center justify-center bg-surface-bright p-8">
          <p className="font-body-md text-body-md text-on-surface-variant">
            {loading ? 'Loading invoice...' : 'Invoice not found.'}
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title={invoice.invoiceNumber} backTo="/invoice" />

      <main className="flex-1 overflow-y-auto bg-surface-bright">
        <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-8">
          {/* Header */}
          <header className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant bg-surface pb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => navigate('/invoice')}
                className="hidden size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high lg:inline-flex"
                aria-label="Go back"
              >
                <ArrowLeft className="size-5" />
              </Button>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                {invoice.invoiceNumber}
              </h1>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left / Main: Invoice Card */}
            <div className="flex flex-col gap-6 lg:col-span-8 print-area">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">
                {/* Invoice Header */}
                <div className="mb-12 flex flex-col justify-between gap-6 border-b border-surface-variant pb-8 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded bg-primary text-on-primary">
                      <Layers className="size-7" />
                    </div>
                    <div>
                      <h2 className="font-headline-md text-headline-md text-primary">
                        LabelMaster
                      </h2>
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        Enterprise Labeling Solutions
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      <MetaRow label="Invoice No:" value={`#${invoice.invoiceNumber}`} />
                      <MetaRow label="Date Issued:" value={formatDate(invoice.createdAt)} />
                      <MetaRow label="Due Date:" value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'} />
                      <MetaRow label="Billing Period:" value={invoice.billingPeriod} />
                    </div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="mb-10">
                  <h3 className="mb-3 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                    Bill To
                  </h3>
                  <div className="mb-1 font-headline-md text-headline-md text-on-surface">
                    {invoice.customerName}
                  </div>
                  {invoice.customerAddress ? (
                    <p className="font-body-md text-body-md text-on-surface">
                      {invoice.customerAddress.split('\n').map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p className="mt-2 font-label-md text-label-md text-on-surface-variant">
                    {invoice.customerEmail}
                    <br />
                    {invoice.customerPhone}
                  </p>
                </div>

                {/* Line Items Table */}
                <div className="mb-10 overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b-2 border-outline-variant">
                        <th className="w-12 px-2 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Sl No
                        </th>
                        <th className="px-2 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Date
                        </th>
                        <th className="px-2 py-4 text-right font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Weight (kg)
                        </th>
                        <th className="px-2 py-4 text-right font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Rate (₹)
                        </th>
                        <th className="px-2 py-4 text-right font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Amount (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-label-md text-label-md text-on-surface">
                      {invoice.lineItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-surface-variant transition-colors hover:bg-surface-container-low"
                        >
                          <td className="px-2 py-4">{item.slNo}</td>
                          <td className="px-2 py-4">{formatDate(item.date)}</td>
                          <td className="px-2 py-4 text-right">{toAmount(item.weightKg)}</td>
                          <td className="px-2 py-4 text-right">{toAmount(item.rate)}</td>
                          <td className="px-2 py-4 text-right font-bold">
                            {toAmount(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Totals */}
                <div className="flex justify-end">
                  <div className="w-64 border-t-2 border-outline-variant pt-4">
                    <div className="mb-4 flex justify-between font-label-md text-label-md">
                      <span className="text-on-surface-variant">Total Weight</span>
                      <span className="text-on-surface">{toAmount(invoice.totalWeight)} kg</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-surface-variant pt-4">
                      <span className="font-headline-md text-headline-md text-on-surface">
                        Total
                      </span>
                      <span className="text-[20px] font-bold text-primary">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Payment Summary */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 rounded-xl border border-outline-variant bg-surface-container-low p-6 print:hidden">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    Payment Status
                  </h3>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 font-label-sm text-label-sm font-bold tracking-wide uppercase',
                      statusPillStyles[invoice.status]
                    )}
                  >
                    {invoice.status}
                  </span>
                </div>

                <div className="mb-6 rounded border border-outline-variant bg-surface-container-lowest p-5">
                  <div className="mb-4 flex items-end justify-between border-b border-surface-variant pb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      Paid Amount
                    </span>
                    <span className="text-[20px] font-bold text-secondary">
                      {formatCurrency(invoice.paid)}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      Due Amount
                    </span>
                    <span className="text-[24px] font-bold text-destructive">
                      {formatCurrency(invoice.due)}
                    </span>
                  </div>
                </div>

                {invoice.due > 0 ? (
                  <Button
                    type="button"
                    onClick={() => setPaymentOpen(true)}
                    className="mb-8 flex h-[52px] w-full items-center justify-center gap-2 rounded font-label-md text-label-md shadow-sm"
                  >
                    <Wallet className="size-5" />
                    Record Payment
                  </Button>
                ) : (
                  <div className="mb-8 flex h-[52px] items-center justify-center rounded font-label-md text-label-md text-secondary">
                    Fully paid
                  </div>
                )}

                <div>
                  <h4 className="mb-4 border-b border-surface-variant pb-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                    Payment History
                  </h4>
                  {invoice.payments.length === 0 ? (
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {invoice.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="rounded border border-outline-variant bg-surface-container-lowest p-4 text-sm"
                        >
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <span className="font-label-md text-label-md font-bold text-on-surface">
                              {formatCurrency(payment.amount)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-label-sm text-label-sm text-on-surface-variant">
                                {formatDate(payment.date)}
                              </span>
                              {canManagePayments ? (
                                <button
                                  type="button"
                                  onClick={() => setMenuFor(payment)}
                                  className="grid size-7 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                                  aria-label={`Actions for payment of ${formatCurrency(payment.amount)}`}
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              ) : null}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-on-surface-variant">
                            <span>
                              {paymentModes.find((item) => item.value === payment.mode)?.label ??
                                payment.mode}
                            </span>
                            {payment.notes ? <span>{payment.notes}</span> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        payment={null}
        dueAmount={invoice.due}
        onSave={handleRecordPayment}
      />

      <PaymentDialog
        open={editingPayment != null}
        onOpenChange={(open) => {
          if (!open) setEditingPayment(null)
        }}
        payment={editingPayment}
        dueAmount={invoice.due}
        onSave={handleEditPayment}
      />

      <AlertDialog
        open={menuFor != null}
        onOpenChange={(open) => {
          if (!open) setMenuFor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {menuFor ? formatCurrency(menuFor.amount) : 'Payment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose an action for this payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const payment = menuFor
                setMenuFor(null)
                if (payment) setEditingPayment(payment)
              }}
            >
              <Pencil className="size-4" />
              Edit payment
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => {
                setDeleteFor(menuFor)
                setMenuFor(null)
              }}
            >
              <Trash2 className="size-4" />
              Delete payment
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteFor != null}
        onOpenChange={(open) => {
          if (!open) setDeleteFor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFor
                ? `This will remove the ${formatCurrency(deleteFor.amount)} payment recorded on ${formatDate(deleteFor.date)} and update the invoice balance. This action cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}