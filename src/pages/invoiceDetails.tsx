import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Layers,
  Share2,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  demoInvoices,
  type Invoice,
  type InvoicePayment,
  type InvoiceStatus,
} from '@/lib/demo/invoices'
import { formatCurrency, todayInputValue } from '@/lib/format'
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

const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'] as const
type PaymentMode = (typeof paymentModes)[number]

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dueAmount: number
  onSave: (payment: InvoicePayment) => void
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  dueAmount,
  onSave,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState<string>(String(Math.round(dueAmount)))
  const [date, setDate] = useState<string>(todayInputValue())
  const [mode, setMode] = useState<PaymentMode>('Bank Transfer')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const reset = () => {
    setAmount(String(Math.round(dueAmount)))
    setDate(todayInputValue())
    setMode('Bank Transfer')
    setNotes('')
    setError('')
  }

  const handleSave = () => {
    const value = Number(amount)
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (value > dueAmount) {
      setError(`Amount cannot exceed the due amount of ${formatCurrency(dueAmount)}.`)
      return
    }
    onSave({
      amount: value,
      date: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      method: mode,
      receivedBy: 'Admin',
    })
    onOpenChange(false)
    setNotes('')
    toast.success('Payment recorded')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (next) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="payment-amount">Amount (₹)</Label>
            <Input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError('')
              }}
              className="h-11 px-4 text-base"
              autoFocus
            />
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
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    'h-10 rounded-lg border font-label-sm text-label-sm transition-colors',
                    mode === item
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant hover:bg-surface-container-low'
                  )}
                >
                  {item}
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
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InvoiceDetails() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const found = demoInvoices.find((item) => item.id === id)
  const [invoice, setInvoice] = useState<Invoice | null>(found ?? null)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const handleShare = () => toast.info('Sharing coming soon')
  const handleExportPdf = () => toast.info('PDF export coming soon')

  const handleRecordPayment = (payment: InvoicePayment) => {
    if (!invoice) return
    const newPaid = invoice.paid + payment.amount
    const newDue = Math.max(0, invoice.total - newPaid)
    const newStatus: InvoiceStatus =
      newDue <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid'
    setInvoice({
      ...invoice,
      paid: newPaid,
      due: newDue,
      status: newStatus,
      payments: [...invoice.payments, payment],
    })
  }

  if (!invoice) {
    return (
      <div className="flex h-full flex-col">
        <TopNav title="Invoice Details" backTo="/invoice" />
        <main className="flex flex-1 items-center justify-center bg-surface-bright p-8">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Invoice not found.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title={invoice.invoiceId} backTo="/invoice" />

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
                {invoice.invoiceId}
              </h1>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleShare}
                className="h-12 gap-2 rounded border-outline-variant bg-surface-container-lowest px-4 font-label-md text-label-md text-primary hover:bg-surface-container-low"
              >
                <Share2 className="size-5" />
                Share
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportPdf}
                className="h-12 gap-2 rounded px-6 font-label-md text-label-md"
              >
                <FileText className="size-5" />
                Export PDF
              </Button>
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
                      <MetaRow label="Invoice No:" value={`#${invoice.invoiceId}`} />
                      <MetaRow label="Date Issued:" value={invoice.dateIssued} />
                      <MetaRow label="Due Date:" value={invoice.dueDate} />
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
                    {invoice.customer}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">
                    {invoice.address.split('\n').map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                  <p className="mt-2 font-label-md text-label-md text-on-surface-variant">
                    {invoice.email}
                    <br />
                    {invoice.phone}
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
                          key={item.slNo}
                          className="border-b border-surface-variant transition-colors hover:bg-surface-container-low"
                        >
                          <td className="px-2 py-4">{item.slNo}</td>
                          <td className="px-2 py-4">{item.date}</td>
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
                    <div className="mb-2 flex justify-between font-label-md text-label-md">
                      <span className="text-on-surface-variant">Subtotal</span>
                      <span className="text-on-surface">{toAmount(invoice.subtotal)}</span>
                    </div>
                    <div className="mb-4 flex justify-between font-label-md text-label-md">
                      <span className="text-on-surface-variant">
                        Tax ({invoice.taxRate}%)
                      </span>
                      <span className="text-on-surface">{toAmount(invoice.tax)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-surface-variant pt-4">
                      <span className="font-headline-md text-headline-md text-on-surface">
                        Total
                      </span>
                      <span className="text-[20px] font-bold text-primary">
                        {formatCurrency(invoice.total)}
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

                <Button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="mb-8 flex h-[52px] w-full items-center justify-center gap-2 rounded font-label-md text-label-md shadow-sm"
                >
                  <Wallet className="size-5" />
                  Record Payment
                </Button>

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
                      {invoice.payments.map((payment, index) => (
                        <li
                          key={index}
                          className="rounded border border-outline-variant bg-surface-container-lowest p-4 text-sm"
                        >
                          <div className="mb-1 flex justify-between">
                            <span className="font-label-md text-label-md font-bold text-on-surface">
                              {formatCurrency(payment.amount)}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {payment.date}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-on-surface-variant">
                            <span>{payment.method}</span>
                            <span>Rcvd by: {payment.receivedBy}</span>
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

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        dueAmount={invoice.due}
        onSave={handleRecordPayment}
      />
    </div>
  )
}
