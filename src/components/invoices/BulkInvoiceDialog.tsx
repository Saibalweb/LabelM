import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  Loader2,
  SkipForward,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DueDateSelect } from '@/components/invoices/DueDateSelect'
import {
  useBulkGenerateInvoices,
  useInvoicePreviewQuery,
} from '@/hooks/queries'
import {
  dueDateForTerms,
  isValidRange,
  monthBounds,
  monthLabel,
  monthRangeLabel,
  previousMonthValue,
  rangeLabel,
  type DueTerms,
} from '@/lib/period'
import { formatCurrency, formatDate, todayInputValue } from '@/lib/format'
import type { InvoiceGenerationResult } from '@/lib/types'
import { cn } from '@/lib/utils'

type Step = 'period' | 'preview' | 'generating' | 'result'

const inputClasses =
  'h-11 w-full rounded-lg border border-outline-variant bg-surface px-4 font-label-md text-label-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none'

function toAmount(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface BulkInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkInvoiceDialog({ open, onOpenChange }: BulkInvoiceDialogProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('period')
  const [monthValue, setMonthValue] = useState(previousMonthValue())
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const today = useMemo(() => todayInputValue(), [])
  const [dueTerms, setDueTerms] = useState<DueTerms>('net30')
  const [customDue, setCustomDue] = useState('')
  const dueDate = dueDateForTerms(dueTerms, today, customDue)
  const [results, setResults] = useState<InvoiceGenerationResult[] | null>(null)
  const [progressIndex, setProgressIndex] = useState(0)

  const bulkGenerate = useBulkGenerateInvoices()

  const bounds = useMemo(
    () => monthBounds(monthValue) ?? { from: '', to: '' },
    [monthValue]
  )
  const from = bounds.from || customFrom
  const to = bounds.to || customTo
  const periodValid = isValidRange(from, to)

  const reset = () => {
    setStep('period')
    setMonthValue(previousMonthValue())
    setCustomFrom('')
    setCustomTo('')
    setDueTerms('net30')
    setCustomDue('')
    setResults(null)
    setProgressIndex(0)
  }

  const handleTermsChange = (next: DueTerms) => {
    if (next === 'custom' && !customDue) {
      setCustomDue(dueDateForTerms('net30', today, ''))
    }
    setDueTerms(next)
  }

  const { data: preview = [], isFetching: previewLoading } = useInvoicePreviewQuery(
    from,
    to,
    open && periodValid && (step === 'preview' || step === 'generating')
  )

  const created = results?.filter((result) => result.invoiceId != null) ?? []
  const skipped = results?.filter((result) => result.invoiceId == null) ?? []
  const totalAmount = preview.reduce((sum, row) => sum + row.totalAmount, 0)

  useEffect(() => {
    if (!open) return
    reset()
    // oxlint-disable-next-line react/set-state-in-effect
  }, [open])

  useEffect(() => {
    if (step !== 'generating' || preview.length === 0) return
    const timer = setInterval(() => {
      setProgressIndex((index) => (index + 1) % preview.length)
    }, 900)
    return () => clearInterval(timer)
  }, [step, preview.length])

  const periodLabel = monthBounds(monthValue) ? monthLabel(monthValue) : rangeLabel(customFrom, customTo)

  const handleGenerate = async () => {
    if (!periodValid || !dueDate) return
    setStep('generating')
    setProgressIndex(0)
    try {
      const rows = await bulkGenerate.mutateAsync({ from, to, dueDate })
      setResults(rows)
      setStep('result')
      const count = rows.filter((row) => row.invoiceId != null).length
      toast.success(`${count} invoice${count === 1 ? '' : 's'} generated`)
    } catch {
      toast.error('Failed to generate invoices.')
      setStep('preview')
    }
  }

  const handleDone = () => {
    onOpenChange(false)
    if (results) {
      const first = created[0]
      if (created.length === 1 && first?.invoiceId != null) {
        navigate(`/invoice/${first.invoiceId}`)
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-outline-variant p-5">
          <DialogTitle className="font-headline-md text-headline-md">
            Generate Invoices — All Active Customers
          </DialogTitle>
          <p className="font-body-md text-body-md text-on-surface-variant">
            One invoice per customer with uninvoiced labels in the period.
          </p>
        </DialogHeader>

        {/* Period selection */}
        {step === 'period' ? (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMonthValue(previousMonthValue())
                  setCustomFrom('')
                  setCustomTo('')
                }}
                className={cn(
                  'h-11 rounded-lg border font-label-md text-label-md transition-colors',
                  monthValue !== ''
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant hover:bg-surface-container-low'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setMonthValue('')}
                className={cn(
                  'h-11 rounded-lg border font-label-md text-label-md transition-colors',
                  monthValue === ''
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant hover:bg-surface-container-low'
                )}
              >
                Custom Range
              </button>
            </div>

            {monthValue !== '' ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                  <CalendarDays className="size-4" />
                  Billing Month
                </label>
                <input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className={inputClasses}
                />
                {monthValue ? (
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {monthRangeLabel(monthValue)}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <CalendarDays className="size-4" />
                    From
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <CalendarDays className="size-4" />
                    To (exclusive)
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <p className="col-span-2 font-label-sm text-label-sm text-on-surface-variant">
                  Labels dated before this day are included.
                </p>
              </div>
            )}

            <DueDateSelect
              terms={dueTerms}
              onTermsChange={handleTermsChange}
              customDate={customDue}
              onCustomDateChange={setCustomDue}
              dueDate={dueDate}
              inputClassName={inputClasses}
            />
          </div>
        ) : null}

        {/* Preview */}
        {step === 'preview' ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">{periodLabel}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {rangeLabel(from, to)}
                </p>
                {dueDate ? (
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Due {formatDate(dueDate)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-1.5 font-label-md text-label-md text-primary hover:bg-transparent hover:text-primary/80"
                onClick={() => setStep('period')}
              >
                <ArrowLeft className="size-4" />
                Change period
              </Button>
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-on-surface-variant">
                <Loader2 className="size-5 animate-spin" />
                <span className="font-body-md text-body-md">Preparing preview…</span>
              </div>
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Users className="size-9 text-on-surface-variant" />
                <p className="font-body-md text-body-md text-on-surface">
                  No uninvoiced labels in this period.
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  No invoices will be generated.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                      <th className="p-3 font-semibold">Customer</th>
                      <th className="p-3 text-right font-semibold">Labels</th>
                      <th className="p-3 text-right font-semibold">Weight (kg)</th>
                      <th className="p-3 text-right font-semibold">Amount (₹)</th>
                      <th className="p-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md text-on-surface">
                    {preview.map((row) => (
                      <tr key={row.customerId} className="border-b border-outline-variant last:border-b-0">
                        <td className="p-3 font-label-md text-label-md font-medium">{row.customerName}</td>
                        <td className="p-3 text-right font-label-md text-label-md">{row.labelCount}</td>
                        <td className="p-3 text-right font-label-md text-label-md">{toAmount(row.totalWeight)}</td>
                        <td className="p-3 text-right font-label-md text-label-md font-bold">
                          {formatCurrency(row.totalAmount)}
                        </td>
                        <td className="p-3 text-center">
                          {row.hasOverlap ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-container px-2.5 py-1 font-label-sm text-label-sm text-on-tertiary-container">
                              <FileWarning className="size-3.5" />
                              Skipped
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-secondary-container px-2.5 py-1 font-label-sm text-label-sm text-on-secondary-container">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.length > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {preview.filter((row) => !row.hasOverlap).length} invoices to generate
                </span>
                <span className="font-headline-md text-headline-md text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Generating */}
        {step === 'generating' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10">
            <Loader2 className="size-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-headline-md text-headline-md text-on-surface">
                Generating invoices…
              </p>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                {preview.length > 0
                  ? `For ${preview[progressIndex]?.customerName ?? ''}`
                  : periodLabel}
              </p>
            </div>
            <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: preview.length > 0 ? `${((progressIndex + 1) / preview.length) * 100}%` : '50%',
                }}
              />
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Creating one invoice per customer and locking their labels.
            </p>
          </div>
        ) : null}

        {/* Result */}
        {step === 'result' && results ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {created.length > 0 ? (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                  <CheckCircle2 className="size-4 text-secondary" />
                  Created — {created.length}
                </h3>
                <div className="overflow-hidden rounded-xl border border-outline-variant">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                        <th className="p-3 font-semibold">Invoice No</th>
                        <th className="p-3 font-semibold">Customer</th>
                        <th className="p-3 text-right font-semibold">Labels</th>
                        <th className="p-3 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md text-on-surface">
                      {created.map((row) => (
                        <tr
                          key={row.invoiceId}
                          className="cursor-pointer border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low"
                          onClick={() => row.invoiceId != null && navigate(`/invoice/${row.invoiceId}`)}
                        >
                          <td className="p-3 font-label-md text-label-md font-bold text-primary">
                            {row.invoiceNumber}
                          </td>
                          <td className="p-3 font-label-md text-label-md">{row.customerName}</td>
                          <td className="p-3 text-right font-label-md text-label-md">{row.labelCount}</td>
                          <td className="p-3 text-right font-label-md text-label-md font-bold">
                            {formatCurrency(row.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {skipped.length > 0 ? (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                  <SkipForward className="size-4 text-tertiary" />
                  Skipped — {skipped.length}
                </h3>
                <div className="overflow-hidden rounded-xl border border-outline-variant">
                  <table className="w-full border-collapse text-left">
                    <tbody className="font-body-md text-body-md text-on-surface">
                      {skipped.map((row) => (
                        <tr key={row.customerId} className="border-b border-outline-variant last:border-b-0">
                          <td className="p-3 font-label-md text-label-md">{row.customerName}</td>
                          <td className="p-3 text-right font-label-sm text-label-sm text-on-surface-variant">
                            {row.skipped === 'overlap'
                              ? 'Already invoiced in this period'
                              : 'No uninvoiced labels'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="p-5 pt-4">
          {step === 'period' ? (
            <Button
              type="button"
              onClick={() => setStep('preview')}
              disabled={!periodValid || !dueDate}
              className="h-12 w-full gap-2 rounded-lg font-label-md text-label-md sm:w-auto"
            >
              Preview
              <ArrowRight className="size-4" />
            </Button>
          ) : null}

          {step === 'preview' ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-lg border-outline-variant font-label-md text-label-md"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={preview.length === 0 || preview.every((row) => row.hasOverlap)}
                className="h-12 gap-2 rounded-lg font-label-md text-label-md"
              >
                Generate {preview.filter((row) => !row.hasOverlap).length} invoices
              </Button>
            </>
          ) : null}

          {step === 'result' ? (
            <Button
              type="button"
              onClick={handleDone}
              className="h-12 w-full gap-2 rounded-lg font-label-md text-label-md sm:w-auto"
            >
              Done
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}