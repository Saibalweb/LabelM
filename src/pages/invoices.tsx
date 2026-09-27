import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { BulkInvoiceDialog } from '@/components/invoices/BulkInvoiceDialog'
import { useAppSelector } from '@/store/hooks'
import { useCustomersQuery, useInvoiceListQuery } from '@/hooks/queries'
import { hasRole } from '@/lib/roles'
import {
  currentMonthValue,
  isoDate,
  monthBounds,
  previousMonthValue,
} from '@/lib/period'
import type {
  Invoice,
  InvoiceFilters,
  InvoiceSortKey,
  InvoiceStatus,
} from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type StatusFilter = 'All' | InvoiceStatus | 'Overdue'
type DurationFilter = 'all' | 'month' | 'last-month' | 'custom'

const PAGE_SIZE = 25

const statusPills: StatusFilter[] = ['All', 'Unpaid', 'Partial', 'Paid', 'Overdue']

const statusPillStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-secondary-container text-on-secondary-container',
  Unpaid: 'bg-destructive/10 text-destructive',
  Partial: 'bg-tertiary-container text-on-tertiary-container',
}

const durationButtons: { value: DurationFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
]

const statusOptions: { value: InvoiceStatus; label: string; dot: string }[] = [
  { value: 'Unpaid', label: 'Unpaid', dot: 'bg-destructive' },
  { value: 'Partial', label: 'Partial', dot: 'bg-tertiary' },
  { value: 'Paid', label: 'Paid', dot: 'bg-secondary' },
]

const sortOptions: { value: InvoiceSortKey; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-desc', label: 'Amount: High → Low' },
  { value: 'amount-asc', label: 'Amount: Low → High' },
]

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function durationBounds(
  duration: DurationFilter,
  fromDate: string,
  toDate: string
): { from: string; to: string } | null {
  if (duration === 'month') return monthBounds(currentMonthValue())
  if (duration === 'last-month') return monthBounds(previousMonthValue())
  if (duration === 'custom') {
    if (!fromDate || !toDate) return null
    const from = new Date(`${fromDate}T00:00:00`)
    const to = new Date(`${toDate}T00:00:00`)
    to.setDate(to.getDate() + 1)
    return { from: isoDate(from), to: isoDate(to) }
  }
  return null
}

export function Invoices() {
  const navigate = useNavigate()
  const role = useAppSelector((state) => state.auth.user?.role)
  const canManage = hasRole(role, 'admin')
  const { data: customers = [] } = useCustomersQuery()

  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [duration, setDuration] = useState<DurationFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerIds, setCustomerIds] = useState<number[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [statuses, setStatuses] = useState<InvoiceStatus[]>([])
  const [overdue, setOverdue] = useState(false)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState<InvoiceSortKey>('newest')
  const [page, setPage] = useState(1)
  const [bulkOpen, setBulkOpen] = useState(false)

  const debouncedQuery = useDebouncedValue(query)
  const debouncedMinAmount = useDebouncedValue(minAmount)
  const debouncedMaxAmount = useDebouncedValue(maxAmount)

  const filters = useMemo<InvoiceFilters>(() => {
    const bounds = durationBounds(duration, fromDate, toDate)
    return {
      query: debouncedQuery.trim() || undefined,
      statuses: overdue ? ['Unpaid', 'Partial'] : statuses,
      customerIds,
      from: bounds?.from,
      to: bounds?.to,
      minAmount: debouncedMinAmount !== '' ? parseFloat(debouncedMinAmount) : null,
      maxAmount: debouncedMaxAmount !== '' ? parseFloat(debouncedMaxAmount) : null,
      overdue: overdue || undefined,
    }
  }, [
    debouncedQuery,
    overdue,
    statuses,
    customerIds,
    duration,
    fromDate,
    toDate,
    debouncedMinAmount,
    debouncedMaxAmount,
  ])

  const {
    data: result,
    isPending: loading,
    isFetching,
  } = useInvoiceListQuery(filters, { page, pageSize: PAGE_SIZE, sortBy })
  const invoices = result?.data ?? []
  const total = result?.total ?? 0

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setPage(1)
  }, [filters, sortBy])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  useEffect(() => {
    if (page > totalPages) {
      // oxlint-disable-next-line react/set-state-in-effect
      setPage(totalPages)
    }
  }, [page, totalPages])

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) => String(c.id).includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [customers, customerQuery])

  const selectedCustomerChips = useMemo(
    () => customers.filter((c) => customerIds.includes(c.id)),
    [customers, customerIds]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (duration !== 'all') count += 1
    if (customerIds.length > 0) count += 1
    if (statuses.length > 0) count += 1
    if (overdue) count += 1
    if (minAmount !== '' || maxAmount !== '') count += 1
    return count
  }, [duration, customerIds, statuses, overdue, minAmount, maxAmount])

  const activePill: StatusFilter = overdue
    ? 'Overdue'
    : statuses.length === 1
      ? statuses[0]
      : 'All'

  const toggleCustomer = (id: number) => {
    setCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const toggleStatus = (s: InvoiceStatus) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const toggleOverdue = () => {
    setOverdue((prev) => {
      if (!prev) setStatuses(['Unpaid', 'Partial'])
      return !prev
    })
  }

  const handlePill = (pill: StatusFilter) => {
    if (pill === 'All') {
      setOverdue(false)
      setStatuses([])
    } else if (pill === 'Overdue') {
      setOverdue(true)
      setStatuses(['Unpaid', 'Partial'])
    } else {
      setOverdue(false)
      setStatuses([pill])
    }
  }

  const durationLabel =
    duration === 'custom'
      ? 'Custom Range'
      : durationButtons.find((o) => o.value === duration)?.label ?? 'All Time'

  const handleClearFilters = () => {
    setQuery('')
    setDuration('all')
    setFromDate('')
    setToDate('')
    setCustomerIds([])
    setCustomerQuery('')
    setStatuses([])
    setOverdue(false)
    setMinAmount('')
    setMaxAmount('')
    setSortBy('newest')
  }

  const handleGenerate = () => navigate('/invoice/new')
  const handleView = (invoice: Invoice) => navigate(`/invoice/${invoice.id}`)

  const listStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const listEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)
  const showFilterLoading = isFetching && !loading && page === 1
  const hasNoInvoices =
    !loading && total === 0 && activeFilterCount === 0 && debouncedQuery.trim() === ''

  if (hasNoInvoices) {
    return (
      <div className="flex h-full flex-col">
        <TopNav title="Invoices" />
        <main className="no-scrollbar flex flex-1 items-center justify-center overflow-y-auto bg-surface-bright p-4 lg:p-8">
          <div className="w-full max-w-2xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Invoices</h2>
                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Track billing, payments, and outstanding dues for your customers.
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  onClick={handleGenerate}
                  className="h-[52px] min-h-[52px] gap-2 rounded-lg px-6 font-label-md text-label-md"
                >
                  <Plus className="size-5" />
                  Generate Invoice
                </Button>
              ) : null}
            </div>
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
              <div className="relative mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container text-primary">
                <Users className="size-9" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">
                No invoices yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm font-body-md text-body-md text-on-surface-variant">
                Invoices are generated from uninvoiced labels. Pick a billing period and
                create them one by one, or generate them for all active customers at once.
              </p>
              {canManage ? (
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    className="h-12 w-full gap-2 rounded-full px-6 font-label-md text-label-md text-white sm:w-auto"
                  >
                    <Plus className="size-4" />
                    Generate Invoice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkOpen(true)}
                    className="h-12 w-full gap-2 rounded-full border-outline-variant px-6 font-label-md text-label-md text-primary hover:bg-surface-container-low sm:w-auto"
                  >
                    <Users className="size-4" />
                    Generate for All Customers
                  </Button>
                </div>
              ) : (
                <p className="mt-6 font-label-sm text-label-sm text-on-surface-variant">
                  Only owners and admins can generate invoices.
                </p>
              )}
            </div>
          </div>
        </main>

        <BulkInvoiceDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Invoices" />
      <MobileSearchBar value={query} onChange={setQuery} placeholder="Search customer or ID..." />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Invoices</h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Track billing, payments, and outstanding dues for your customers.
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBulkOpen(true)}
                  className="h-[52px] min-h-[52px] gap-2 rounded-lg border-outline-variant bg-surface-container-lowest px-5 font-label-md text-label-md text-primary hover:bg-surface-container-low hover:text-primary"
                >
                  <Users className="size-5" />
                  Generate for All
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerate}
                  className="h-[52px] min-h-[52px] gap-2 rounded-lg px-6 font-label-md text-label-md"
                >
                  <Plus className="size-5" />
                  Generate Invoice
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="relative w-full max-w-sm">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
                <Search className="size-5" />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer or ID..."
                className="h-12 w-full rounded-lg border border-outline-variant bg-surface pr-4 pl-10 font-label-md text-label-md text-on-surface transition-shadow placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="no-scrollbar flex overflow-x-auto rounded-lg bg-surface-container-high p-1">
                {statusPills.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => handlePill(pill)}
                    className={cn(
                      'min-h-10 whitespace-nowrap rounded-md px-4 font-label-md text-label-md transition-all',
                      activePill === pill
                        ? 'bg-surface-container-lowest text-on-secondary-container shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-lowest/60 hover:text-on-surface'
                    )}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setFilterOpen(true)}
                className="h-12 gap-2 rounded-lg border-transparent bg-surface-container-high px-5 font-label-md text-label-md text-on-surface shadow-sm hover:bg-surface-container-highest"
              >
                <SlidersHorizontal className="size-[18px]" />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary font-label-sm text-label-sm font-bold text-on-primary">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            {showFilterLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-lowest/70">
                <div className="flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 shadow-md ring-1 ring-outline-variant">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="font-label-md text-label-md text-on-surface">Loading…</span>
                </div>
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <th className="p-6 font-semibold">Customer</th>
                    <th className="p-6 font-semibold">Invoice ID</th>
                    <th className="p-6 font-semibold">Billing Period</th>
                    <th className="p-6 text-right font-semibold">Total Amount</th>
                    <th className="p-6 text-right font-semibold">Paid</th>
                    <th className="p-6 text-right font-semibold">Due</th>
                    <th className="p-6 text-center font-semibold">Status</th>
                    <th className="p-6 font-semibold">Generated On</th>
                    <th className="p-6 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-outline-variant">
                        <td colSpan={9} className="p-6">
                          <div className="h-6 animate-pulse rounded bg-surface-container-high" />
                        </td>
                      </tr>
                    ))
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center font-body-md text-body-md text-on-surface-variant">
                        No invoices match your filters.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        onClick={() => handleView(invoice)}
                        className="cursor-pointer border-b border-outline-variant transition-colors last:border-b-0 hover:bg-surface-container-low"
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-variant text-sm font-bold',
                                statusPillStyles[invoice.status]
                              )}
                            >
                              #{invoice.customerId}
                            </div>
                            <span className="font-semibold text-on-background">
                              {invoice.customerName}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 font-label-md text-label-md text-on-surface-variant">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="p-6 text-on-surface-variant">{invoice.period}</td>
                        <td className="p-6 text-right font-label-md text-label-md font-medium text-on-background">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="p-6 text-right font-label-md text-label-md text-on-surface-variant">
                          {formatCurrency(invoice.paid)}
                        </td>
                        <td
                          className={cn(
                            'p-6 text-right font-label-md text-label-md',
                            invoice.due > 0 ? 'font-bold text-destructive' : 'text-on-surface-variant'
                          )}
                        >
                          {formatCurrency(invoice.due)}
                        </td>
                        <td className="p-6 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold',
                              statusPillStyles[invoice.status]
                            )}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="p-6 font-label-md text-label-md text-on-surface-variant">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="p-6 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            className="size-10 rounded-full text-on-surface-variant hover:bg-primary-fixed hover:text-primary"
                            aria-label={`View ${invoice.invoiceNumber}`}
                            onClick={() => handleView(invoice)}
                          >
                            <Eye className="size-5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-6 py-4 font-label-md text-label-md text-on-surface-variant">
              <span>
                {isFetching && page > 1 ? (
                  'Loading...'
                ) : (
                  <>
                    Showing {listStart}-{listEnd} of {total.toLocaleString()}
                  </>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="size-10 rounded border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-[18px]" />
                </Button>
                <span className="min-w-14 text-center font-label-sm text-label-sm text-on-surface-variant">
                  Page {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="size-10 rounded border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-[18px]" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 border-l border-outline-variant bg-surface-container-lowest sm:max-w-[420px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SlidersHorizontal className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="font-sans text-[17px] leading-6 font-semibold tracking-tight text-on-surface">
                    Filter Invoices
                  </SheetTitle>
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-primary-fixed-dim px-2 py-0.5 font-sans text-[11px] font-semibold text-on-primary-fixed">
                      {activeFilterCount} active
                    </span>
                  ) : null}
                </div>
                <SheetDescription className="mt-1 font-sans text-[13px] leading-5 text-on-surface-variant">
                  Refine records by timeframe, customer, status, and amount.
                </SheetDescription>
              </div>
            </div>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Close"
                className="size-8 shrink-0 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-sm text-[11px] leading-4 font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
                  <CalendarDays className="size-3.5 text-primary" />
                  Billing Period
                </span>
                <span className="font-sans text-[12px] font-medium text-on-surface-variant">
                  {durationLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {durationButtons.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDuration(option.value)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-center font-sans text-[13px] leading-5 font-medium transition-colors',
                      duration === option.value
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDuration('custom')}
                  className={cn(
                    'col-span-2 rounded-lg px-3 py-2 text-center font-sans text-[13px] leading-5 font-medium transition-colors',
                    duration === 'custom'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  )}
                >
                  Custom Date Range
                </button>
              </div>
              {duration === 'custom' ? (
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[12px] font-medium text-on-surface-variant">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-10 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 font-sans text-[13px] text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[12px] font-medium text-on-surface-variant">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-10 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 font-sans text-[13px] text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="h-px w-full bg-outline-variant/60" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-sm text-[11px] leading-4 font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
                  <Users className="size-3.5 text-primary" />
                  Customer
                </span>
                {customerIds.length > 0 ? (
                  <span className="font-sans text-[12px] font-semibold text-secondary">
                    {customerIds.length} Selected
                  </span>
                ) : null}
              </div>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <Search className="size-4 shrink-0 text-outline" />
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search customer name or ID..."
                  className="w-full bg-transparent font-sans text-[13px] text-on-surface outline-none placeholder:text-outline"
                />
                {customerQuery ? (
                  <button
                    type="button"
                    onClick={() => setCustomerQuery('')}
                    className="text-outline hover:text-on-surface"
                    aria-label="Clear customer search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              {selectedCustomerChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCustomerChips.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-sans text-[12px] leading-4 font-medium text-primary"
                    >
                      <CheckCircle2 className="size-3.5" />
                      {c.name}
                      <button
                        type="button"
                        onClick={() => toggleCustomer(c.id)}
                        className="flex items-center hover:opacity-75"
                        aria-label={`Remove ${c.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-1">
                {filteredCustomers.length === 0 ? (
                  <div className="px-2 py-4 text-center font-sans text-[13px] text-on-surface-variant">
                    No customers found.
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-container-low"
                    >
                      <input
                        type="checkbox"
                        checked={customerIds.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="size-4 shrink-0 rounded accent-primary"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-sans text-[13px] leading-5 font-medium text-on-surface">
                          {c.name}
                        </span>
                        <span className="font-sans text-[11px] leading-4 text-on-surface-variant">
                          ID: #{c.id}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="h-px w-full bg-outline-variant/60" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-[11px] leading-4 font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
                <BadgeCheck className="size-3.5 text-primary" />
                Payment Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 py-2.5 transition-colors hover:border-outline-variant hover:bg-surface-container-low"
                  >
                    <input
                      type="checkbox"
                      checked={statuses.includes(option.value)}
                      onChange={() => toggleStatus(option.value)}
                      className="size-4 shrink-0 rounded accent-primary"
                    />
                    <span className={cn('size-2.5 rounded-full', option.dot)} />
                    <span className="font-sans text-[13px] leading-5 font-medium text-on-surface">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 py-2.5 transition-colors hover:border-outline-variant hover:bg-surface-container-low">
                <input
                  type="checkbox"
                  checked={overdue}
                  onChange={toggleOverdue}
                  className="size-4 shrink-0 rounded accent-primary"
                />
                <span className="size-2.5 rounded-full bg-destructive" />
                <span className="font-sans text-[13px] leading-5 font-medium text-on-surface">
                  Overdue
                </span>
              </label>
            </div>

            <div className="h-px w-full bg-outline-variant/60" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-[11px] leading-4 font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
                <Wallet className="size-3.5 text-primary" />
                Amount Range
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex h-10 items-center gap-2 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                  <span className="font-sans text-[12px] font-medium text-on-surface-variant">Min:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-right font-sans text-[13px] font-medium text-on-surface outline-none placeholder:text-outline"
                  />
                </div>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                  <span className="font-sans text-[12px] font-medium text-on-surface-variant">Max:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="∞"
                    className="w-full bg-transparent text-right font-sans text-[13px] font-medium text-on-surface outline-none placeholder:text-outline"
                  />
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-outline-variant/60" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-[11px] leading-4 font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
                <ArrowUpDown className="size-3.5 text-primary" />
                Sort By
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as InvoiceSortKey)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-outline-variant/70 bg-surface-container-lowest pr-9 pl-3 font-sans text-[13px] font-medium text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-outline" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 border-t border-outline-variant bg-surface-container-lowest px-5 py-3.5">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
              className="h-11 gap-2 rounded-lg bg-surface-container px-4 font-sans text-[13px] font-medium text-on-surface hover:bg-surface-container-high"
            >
              <RotateCcw className="size-4" />
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="h-11 flex-1 gap-2 rounded-lg bg-primary px-5 font-sans text-[13px] font-semibold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container"
            >
              Apply Filters
              <span className="rounded-full bg-primary-container px-2 py-0.5 font-label-sm text-[11px] font-semibold text-on-primary-container">
                {total.toLocaleString()} Results
              </span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <BulkInvoiceDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  )
}