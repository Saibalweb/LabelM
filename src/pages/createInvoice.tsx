import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  Check,
  Info,
  ReceiptText,
  Search,
  Users,
  X,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchLabels, updateLabel } from '@/store/slices/labelsSlice'
import { fetchCustomers } from '@/store/slices/customersSlice'
import { createInvoice } from '@/store/slices/invoicesSlice'
import { nextInvoiceId } from '@/services/invoices'
import type { Customer, InvoiceInput, Label } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const inputClasses =
  'w-full h-14 px-4 bg-surface-container-lowest border border-outline-variant rounded font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant'

const steps = [
  { n: 1, label: 'Select Details' },
  { n: 2, label: 'Review Labels' },
  { n: 3, label: 'Confirm' },
]

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return '—'
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function periodRange(value: string): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return ''
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} - ${fmt(end)}`
}

function displayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function toAmount(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function toneFrom(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997
  }
  return hash % 4
}

function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        checked
          ? 'border-primary bg-primary text-on-primary'
          : 'border-outline bg-surface-container-lowest hover:border-primary'
      )}
    >
      {checked ? <Check className="size-4" strokeWidth={3} /> : null}
    </button>
  )
}

function SummaryRow({
  label,
  value,
  mono = false,
  bold = false,
}: {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
        {label}
      </span>
      <span
        className={cn(
          'text-right',
          mono ? 'font-label-md text-label-md' : 'font-body-md text-body-md',
          bold ? 'font-bold text-on-surface' : 'text-on-surface'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function CreateInvoice() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const labels = useAppSelector((state) => state.labels.items)
  const customers = useAppSelector((state) => state.customers.items)
  const invoices = useAppSelector((state) => state.invoices.items)

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState(currentMonthValue())
  const [includeAll, setIncludeAll] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    dispatch(fetchLabels())
    dispatch(fetchCustomers())
  }, [dispatch])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  )

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((customer) =>
      [customer.name, customer.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    )
  }, [customers, customerQuery])

  const filteredLabels = useMemo(() => {
    const period = billingPeriod.trim()
    return labels.filter((label) => {
      if (label.invoiceId) return false
      if (!includeAll && !selectedCustomerId) return false
      if (!includeAll && label.customerId !== selectedCustomerId) return false
      if (period && !label.date.startsWith(period)) return false
      return true
    })
  }, [labels, includeAll, selectedCustomerId, billingPeriod])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setSelectedIds(new Set(filteredLabels.map((label) => label.id)))
  }, [filteredLabels])

  const visibleIds = useMemo(() => new Set(filteredLabels.map((label) => label.id)), [filteredLabels])
  const allSelected = filteredLabels.length > 0 && filteredLabels.every((label) => selectedIds.has(label.id))

  const selectedLabels = useMemo(
    () => filteredLabels.filter((label) => selectedIds.has(label.id)),
    [filteredLabels, selectedIds]
  )

  const subtotal = useMemo(
    () =>
      selectedLabels.reduce((sum, label) => sum + label.amount, 0),
    [selectedLabels]
  )
  const totalWeight = useMemo(
    () => selectedLabels.reduce((sum, label) => sum + label.weight, 0),
    [selectedLabels]
  )

  const previewInvoiceId = useMemo(() => nextInvoiceId(invoices), [invoices])

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const pickCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id)
    setCustomerQuery(customer.name)
    setShowCustomerList(false)
  }

  const canGenerate = (includeAll || !!selectedCustomer) && !!billingPeriod && selectedLabels.length > 0

  const handleGenerate = async () => {
    if (!canGenerate || generating) return
    setGenerating(true)

    const customer = selectedCustomer
    const invoiceInput: InvoiceInput = {
      customer: includeAll ? 'All Active Customers' : customer?.name ?? 'Walk-in Customer',
      customerId: includeAll ? undefined : customer?.id,
      tone: toneFrom(includeAll ? 'all-active-customers' : customer?.name ?? 'walk-in'),
      period: periodRange(billingPeriod),
      billingPeriod: monthLabel(billingPeriod),
      dateIssued: displayDate(new Date()),
      dueDate: displayDate(new Date(Date.now() + 30 * 86_400_000)),
      address: includeAll ? '' : (customer?.address ?? ''),
      email: includeAll ? '' : (customer?.email ?? ''),
      phone: includeAll ? '' : (customer?.phone ?? ''),
      subtotal,
      taxRate: 0,
      tax: 0,
      total: subtotal,
      paid: 0,
      due: subtotal,
      status: 'Unpaid',
      lineItems: selectedLabels.map((label: Label, index) => ({
        slNo: String(index + 1).padStart(2, '0'),
        date: formatDate(label.date),
        weightKg: label.weight,
        rate: label.rate,
        amount: label.amount,
      })),
      payments: [],
    }

    try {
      const created = await dispatch(createInvoice(invoiceInput)).unwrap()
      await Promise.all(
        selectedLabels.map((label) =>
          dispatch(
            updateLabel({ id: label.id, patch: { invoiceId: (created.id as unknown) as number, status: 'printed' } })
          ).unwrap()
        )
      )
      await dispatch(fetchLabels())
      toast.success(`Invoice ${created.invoiceId} generated`)
      navigate(`/invoice/${created.id}`)
    } catch {
      toast.error('Failed to generate invoice.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Generate Invoice" backTo="/invoice" />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Generate Invoice
              </h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Select details, review labels, and confirm — all in one flow.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/invoice')}
              className="h-12 w-fit gap-2 rounded-lg px-4 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              <ArrowLeft className="size-5" />
              Back to Invoices
            </Button>
          </div>

          <div className="mb-8 flex items-center">
            {steps.map((step, index) => (
              <Fragment key={step.n}>
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-label-md font-bold text-on-primary">
                    {step.n}
                  </span>
                  <span className="hidden font-label-md text-label-md font-bold text-primary sm:inline">
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 ? (
                  <span className="mx-3 h-0.5 flex-1 rounded bg-primary/30" />
                ) : null}
              </Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Step 1 — Select Details */}
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-label-md font-bold text-on-primary">
                    1
                  </span>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">
                      Select Details
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Choose the customer and billing period for this invoice.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                      Customer
                    </label>
                    <div className="relative">
                      <span className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant">
                        <Search className="size-5" />
                      </span>
                      <input
                        type="text"
                        value={includeAll ? 'All active customers' : customerQuery}
                        disabled={includeAll}
                        onChange={(e) => {
                          setCustomerQuery(e.target.value)
                          setShowCustomerList(true)
                        }}
                        onFocus={() => setShowCustomerList(true)}
                        onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
                        placeholder="Search customer by name or ID..."
                        className={cn(inputClasses, 'pl-12', includeAll && 'cursor-not-allowed opacity-60')}
                      />

                      {showCustomerList && !includeAll ? (
                        <div className="absolute top-full right-0 left-0 z-30 mt-2 flex max-h-72 flex-col overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                              <p className="font-body-md text-body-md text-on-surface-variant">
                                No customers found.
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => navigate('/customers')}
                                className="mt-2 h-auto rounded-none p-0 font-label-md text-label-md text-primary hover:bg-transparent hover:text-primary/80"
                              >
                                Add a customer first
                              </Button>
                            </div>
                          ) : (
                            filteredCustomers.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickCustomer(customer)}
                                className={cn(
                                  'flex w-full items-center gap-3 border-b border-outline-variant px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-surface-container',
                                  selectedCustomerId === customer.id && 'bg-surface-container'
                                )}
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md text-on-primary-container">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-body-md text-body-md text-on-surface">
                                    {customer.name}
                                  </span>
                                  <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
                                    {customer.email || customer.address || 'No details'}
                                  </span>
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>

                    {includeAll ? (
                      <div className="mt-3 flex items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                          <Users className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-headline-md text-headline-md text-on-surface">
                            All active customers
                          </p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">
                            {customers.length} customers · all uninvoiced labels in the period
                          </p>
                        </div>
                      </div>
                    ) : selectedCustomer ? (
                      <div className="relative mt-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Clear customer"
                          onClick={() => {
                            setSelectedCustomerId(null)
                            setCustomerQuery('')
                          }}
                          className="absolute top-3 right-3 rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        >
                          <X className="size-4" />
                        </Button>
                        <p className="pr-8 font-headline-md text-headline-md text-on-surface">
                          {selectedCustomer.name}
                        </p>
                        {selectedCustomer.email || selectedCustomer.address ? (
                          <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                            {selectedCustomer.email || selectedCustomer.address}
                          </p>
                        ) : null}
                        {selectedCustomer.currentRate != null ? (
                          <span className="mt-2.5 inline-block rounded-full bg-secondary-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-secondary-container uppercase">
                            ₹{selectedCustomer.currentRate}/kg
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                      Billing Period
                    </label>
                    <div className="relative">
                      <span className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant">
                        <Calendar className="size-5" />
                      </span>
                      <input
                        type="month"
                        value={billingPeriod}
                        onChange={(e) => setBillingPeriod(e.target.value)}
                        className={cn(inputClasses, 'pl-12 font-label-md text-label-md')}
                      />
                    </div>
                    {billingPeriod ? (
                      <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
                        {periodRange(billingPeriod)}
                      </p>
                    ) : null}
                  </div>

                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4">
                    <CheckBox
                      checked={includeAll}
                      onChange={() => setIncludeAll((value) => !value)}
                      label="Generate for all active customers"
                    />
                    <span className="font-body-md text-body-md text-on-surface">
                      Generate for all active customers
                    </span>
                  </label>
                </div>
              </section>

              {/* Step 2 — Review Labels */}
              <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-label-md font-bold text-on-primary">
                      2
                    </span>
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface">
                        Review Labels
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Select the labels to include in this invoice.
                      </p>
                    </div>
                  </div>
                  {filteredLabels.length > 0 ? (
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="flex items-center gap-2 font-label-md text-label-md text-primary hover:underline"
                    >
                      <CheckBox
                        checked={allSelected}
                        onChange={toggleAll}
                        label="Select all labels"
                      />
                      {allSelected ? 'Clear all' : 'Select all'}
                    </button>
                  ) : null}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                        <th className="w-14 p-4 text-center">
                          <CheckBox
                            checked={allSelected}
                            onChange={toggleAll}
                            label="Select all labels"
                          />
                        </th>
                        <th className="p-4 font-semibold">Sl No</th>
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 text-right font-semibold">Weight (kg)</th>
                        <th className="p-4 text-right font-semibold">Rate (₹)</th>
                        <th className="p-4 text-right font-semibold">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md text-on-surface">
                      {filteredLabels.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center">
                            <p className="font-body-md text-body-md text-on-surface-variant">
                              {!includeAll && !selectedCustomer
                                ? 'Select a customer above to load their uninvoiced labels.'
                                : 'No uninvoiced labels found for the selected customer and billing period.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredLabels.map((label) => {
                          const amount = label.amount
                          const checked = selectedIds.has(label.id)
                          return (
                            <tr
                              key={label.id}
                              onClick={() => toggle(label.id)}
                              className={cn(
                                'cursor-pointer border-b border-outline-variant transition-colors last:border-b-0',
                                checked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-low'
                              )}
                            >
                              <td className="p-4 text-center">
                                <CheckBox
                                  checked={checked}
                                  onChange={() => toggle(label.id)}
                                  label={`Select label ${label.slNo}`}
                                />
                              </td>
                              <td className="p-4 font-label-md text-label-md font-medium text-on-surface">
                                {label.slNo}
                              </td>
                              <td className="p-4 text-on-surface-variant">
                                {formatDate(label.date)}
                              </td>
                              <td className="p-4 text-right font-label-md text-label-md">
                                {toAmount(label.weight)}
                              </td>
                              <td className="p-4 text-right font-label-md text-label-md text-on-surface-variant">
                                {toAmount(label.rate)}
                              </td>
                              <td className="p-4 text-right font-label-md text-label-md font-bold">
                                {formatCurrency(amount)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-3 font-label-md text-label-md text-on-surface-variant">
                  <span>
                    {selectedLabels.length} of {filteredLabels.length} labels selected
                  </span>
                  <span>
                    Total Weight:{' '}
                    <span className="font-bold text-on-surface">{toAmount(totalWeight)} kg</span>
                  </span>
                </div>
              </section>
            </div>

            {/* Step 3 — Confirm */}
            <div className="lg:col-span-1">
              <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm lg:sticky lg:top-4">
                <div className="flex items-center gap-3 border-b border-outline-variant p-6">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-label-md font-bold text-on-primary">
                    3
                  </span>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Confirm</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Review the summary before generating.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <SummaryRow
                    label="Customer"
                    value={
                      includeAll ? 'All Active Customers' : (selectedCustomer?.name ?? '—')
                    }
                  />
                  <SummaryRow label="Billing Period" value={monthLabel(billingPeriod)} mono />
                  <SummaryRow label="Labels Included" value={String(selectedLabels.length)} mono bold />
                  <SummaryRow label="Invoice ID" value={previewInvoiceId} mono />
                </div>

                <div className="flex items-end justify-between border-t border-outline-variant bg-surface-container-low p-6">
                  <div>
                    <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                      Total Amount Due
                    </p>
                    <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                      Due Net 30
                    </p>
                  </div>
                  <p className="font-headline-lg text-headline-lg font-bold text-primary">
                    {formatCurrency(subtotal)}
                  </p>
                </div>

                <div className="p-6 pt-4">
                  <div className="flex items-start gap-3 rounded-lg border border-tertiary/30 bg-tertiary-container/40 p-4">
                    <Info className="mt-0.5 size-5 shrink-0 text-tertiary" />
                    <p className="font-body-md text-body-md text-on-tertiary-container">
                      <strong>Notice:</strong> Generating this invoice locks the selected labels to
                      the invoice and cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <Button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!canGenerate || generating}
                      className="h-[52px] w-full gap-2 rounded-lg font-label-md text-label-md"
                    >
                      <ReceiptText className="size-5" />
                      {generating ? 'Generating...' : 'Generate Invoice'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/invoice')}
                      className="h-[52px] w-full rounded-lg border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-primary hover:bg-surface-container-low hover:text-primary"
                    >
                      Cancel
                    </Button>
                  </div>

                  {!canGenerate ? (
                    <p className="mt-3 text-center font-label-sm text-label-sm text-on-surface-variant">
                      {!includeAll && !selectedCustomer
                        ? 'Select a customer to continue.'
                        : selectedLabels.length === 0
                          ? 'Select at least one label.'
                          : 'Select a billing period to continue.'}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}