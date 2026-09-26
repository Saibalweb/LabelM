import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  Bookmark,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
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
import { useCustomersQuery, useDueInvoicesQuery } from '@/hooks/queries'
import type {
  DueAgingBucket,
  DueFilters,
  DuePreset,
  DueWindow,
  Invoice,
  InvoiceStatus,
} from '@/lib/types'
import { formatCurrency, formatCurrencyWhole } from '@/lib/format'
import { currentMonthValue, isoDate, monthBounds } from '@/lib/period'
import { cn } from '@/lib/utils'

type SortKey = 'Highest Due First' | 'Oldest First' | 'Name A-Z'

const sortOptions: SortKey[] = ['Highest Due First', 'Oldest First', 'Name A-Z']

const presetPills: { value: DuePreset; label: string }[] = [
  { value: 'all', label: 'All Dues' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due-soon', label: 'Due Soon' },
  { value: 'due-later', label: 'Due 30+ Days' },
]

const agingOptions: { value: DueAgingBucket; label: string; dot: string }[] = [
  { value: 'overdue-1-30', label: 'Overdue 1–30 days', dot: 'bg-tertiary' },
  { value: 'overdue-31-60', label: 'Overdue 31–60 days', dot: 'bg-secondary' },
  { value: 'overdue-60plus', label: 'Overdue 60+ days', dot: 'bg-destructive' },
]

const paymentStatusOptions: { value: InvoiceStatus; label: string; dot: string }[] = [
  { value: 'Unpaid', label: 'Unpaid', dot: 'bg-destructive' },
  { value: 'Partial', label: 'Partial', dot: 'bg-tertiary' },
]

const dueWindowButtons: { value: DueWindow; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'month', label: 'This Month' },
]

const avatarStyles = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-primary-fixed-dim text-on-primary-fixed',
]

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-secondary-container text-on-secondary-container',
  Unpaid: 'bg-destructive/10 text-destructive',
  Partial: 'bg-tertiary-container text-on-tertiary-container',
}

interface DuesInvoice {
  invoice: Invoice
  daysOverdue: number
  statusLabel: string
}

interface DuesCustomer {
  customerId: number
  customer: string
  tone: number
  totalDue: number
  oldestDays: number
  overdueDays: number
  overdue: boolean
  invoices: DuesInvoice[]
}

const DAY_MS = 86_400_000

function parseDate(value: string | null): Date {
  return new Date(`${value ?? '1970-01-01'} 00:00:00`)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysUntilDue(invoice: Invoice, todayMs: number): number {
  return Math.floor((parseDate(invoice.dueDate).getTime() - todayMs) / DAY_MS)
}

function inAgingBucket(days: number, bucket: DueAgingBucket): boolean {
  if (bucket === 'overdue-1-30') return days >= 1 && days <= 30
  if (bucket === 'overdue-31-60') return days >= 31 && days <= 60
  return days > 60
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function dueWindowBounds(
  window: DueWindow,
  fromDate: string,
  toDate: string
): { from?: string; to?: string } | null {
  if (window === 'overdue') return { to: todayISO() }
  if (window === 'month') return monthBounds(currentMonthValue())
  if (window === 'custom') {
    if (!fromDate || !toDate) return null
    const to = new Date(`${toDate}T00:00:00`)
    to.setDate(to.getDate() + 1)
    return { from: fromDate, to: isoDate(to) }
  }
  return null
}

function StatCard({
  label,
  value,
  icon,
  iconClassName,
  decorClassName,
  footnote,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconClassName: string
  decorClassName: string
  footnote: React.ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={cn(
          'absolute -top-4 -right-4 h-24 w-24 rounded-bl-full transition-transform group-hover:scale-110',
          decorClassName
        )}
      />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
          {label}
        </span>
        <span className={iconClassName}>{icon}</span>
      </div>
      <div className="relative z-10 font-headline-lg text-headline-lg text-on-background">
        {value}
      </div>
      <div className="relative z-10 mt-2 flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
        {footnote}
      </div>
    </div>
  )
}

export function Dues() {
  const navigate = useNavigate()
  const { data: customerList = [] } = useCustomersQuery()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('Highest Due First')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [filterOpen, setFilterOpen] = useState(false)
  const [preset, setPreset] = useState<DuePreset>('all')
  const [statuses, setStatuses] = useState<InvoiceStatus[]>([])
  const [customerIds, setCustomerIds] = useState<number[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [dueWindow, setDueWindow] = useState<DueWindow>('all')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [aging, setAging] = useState<DueAgingBucket[]>([])

  const debouncedQuery = useDebouncedValue(query)

  const dueFilters = useMemo<DueFilters>(() => {
    const bounds = dueWindowBounds(dueWindow, dueFrom, dueTo)
    return {
      query: debouncedQuery.trim() || undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      customerIds,
      from: bounds?.from,
      to: bounds?.to,
    }
  }, [debouncedQuery, statuses, customerIds, dueWindow, dueFrom, dueTo])

  const { data: invoices = [] } = useDueInvoicesQuery(dueFilters)

  const referenceNow = useMemo(() => {
    if (invoices.length === 0) return 0
    return Math.max(...invoices.map((inv) => parseDate(inv.dueDate).getTime()))
  }, [invoices])

  const todayMs = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const duesCustomers = useMemo(() => {
    const byCustomer = new Map<number, DuesCustomer>()
    for (const invoice of invoices) {
      if (invoice.due <= 0) continue
      const dueDateMs = parseDate(invoice.dueDate).getTime()
      const daysOverdue = Math.max(0, Math.floor((referenceNow - dueDateMs) / DAY_MS))
      const overdueDays = Math.max(0, Math.floor((todayMs - dueDateMs) / DAY_MS))
      const statusLabel =
        invoice.status === 'Partial'
          ? `Partial (${Math.round((invoice.paid / invoice.totalAmount) * 100)}%)`
          : 'Unpaid'
      const entry = byCustomer.get(invoice.customerId) ?? {
        customerId: invoice.customerId,
        customer: invoice.customerName,
        tone: invoice.id,
        totalDue: 0,
        oldestDays: 0,
        overdueDays: 0,
        overdue: false,
        invoices: [] as DuesInvoice[],
      }
      entry.totalDue += invoice.due
      entry.oldestDays = Math.max(entry.oldestDays, daysOverdue)
      entry.overdueDays = Math.max(entry.overdueDays, overdueDays)
      if (daysOverdue > 0) entry.overdue = true
      entry.invoices.push({ invoice, daysOverdue, statusLabel })
      byCustomer.set(invoice.customerId, entry)
    }
    return Array.from(byCustomer.values())
  }, [invoices, referenceNow, todayMs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const min = minAmount !== '' ? parseFloat(minAmount) : null
    const max = maxAmount !== '' ? parseFloat(maxAmount) : null
    const list = duesCustomers.filter((c) => {
      if (
        q &&
        !c.customer.toLowerCase().includes(q) &&
        !c.invoices.some(({ invoice }) => invoice.invoiceNumber.toLowerCase().includes(q))
      ) {
        return false
      }
      if (preset === 'overdue' && !c.invoices.some(({ invoice }) => daysUntilDue(invoice, todayMs) < 0))
        return false
      if (
        preset === 'due-soon' &&
        !c.invoices.some(({ invoice }) => {
          const days = daysUntilDue(invoice, todayMs)
          return days >= 0 && days <= 7
        })
      )
        return false
      if (
        preset === 'due-later' &&
        !c.invoices.some(({ invoice }) => daysUntilDue(invoice, todayMs) > 30)
      )
        return false
      if (aging.length > 0 && !aging.some((bucket) => inAgingBucket(c.overdueDays, bucket)))
        return false
      if (min != null && c.totalDue < min) return false
      if (max != null && c.totalDue > max) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'Highest Due First') sorted.sort((a, b) => b.totalDue - a.totalDue)
    if (sort === 'Oldest First') sorted.sort((a, b) => b.oldestDays - a.oldestDays)
    if (sort === 'Name A-Z') sorted.sort((a, b) => a.customer.localeCompare(b.customer))
    return sorted
  }, [duesCustomers, query, sort, preset, aging, minAmount, maxAmount, todayMs])

  const totalOutstanding = useMemo(
    () => duesCustomers.reduce((sum, c) => sum + c.totalDue, 0),
    [duesCustomers]
  )
  const oldestDue = useMemo(
    () => duesCustomers.reduce((max, c) => Math.max(max, c.oldestDays), 0),
    [duesCustomers]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (preset !== 'all') count += 1
    if (aging.length > 0) count += 1
    if (statuses.length > 0) count += 1
    if (customerIds.length > 0) count += 1
    if (minAmount !== '' || maxAmount !== '') count += 1
    if (dueWindow !== 'all') count += 1
    return count
  }, [preset, aging, statuses, customerIds, minAmount, maxAmount, dueWindow])

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customerList
    return customerList.filter(
      (c) => String(c.id).includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [customerList, customerQuery])

  const selectedCustomerChips = useMemo(
    () => customerList.filter((c) => customerIds.includes(c.id)),
    [customerList, customerIds]
  )

  const dueWindowLabel =
    dueWindow === 'custom'
      ? 'Custom Range'
      : dueWindow === 'overdue'
        ? 'Overdue'
        : dueWindow === 'month'
          ? 'Due This Month'
          : 'All Time'

  const toggle = (id: number) => {
    const key = String(id)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleStatus = (s: InvoiceStatus) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const toggleAging = (b: DueAgingBucket) => {
    setAging((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
  }

  const toggleCustomer = (id: number) => {
    setCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const handlePresetPill = (p: DuePreset) => {
    setPreset((prev) => (prev === p ? 'all' : p))
  }

  const handleClearFilters = () => {
    setQuery('')
    setPreset('all')
    setStatuses([])
    setCustomerIds([])
    setCustomerQuery('')
    setMinAmount('')
    setMaxAmount('')
    setDueWindow('all')
    setDueFrom('')
    setDueTo('')
    setAging([])
    setSort('Highest Due First')
  }

  const isEmpty =
    duesCustomers.length === 0 &&
    activeFilterCount === 0 &&
    debouncedQuery.trim() === ''

  return (
    <div className="flex h-full flex-col">
      <TopNav
        searchable
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search customer or invoice..."
      />
      <MobileSearchBar value={query} onChange={setQuery} placeholder="Search customer or invoice..." />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Dues Overview
              </h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Track outstanding invoices, overdue accounts, and collections.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate('/invoice')}
              className="h-[52px] min-h-[52px] gap-2 rounded-lg px-6 font-label-md text-label-md"
            >
              <Wallet className="size-5" />
              Manage Invoices
            </Button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard
              label="Total Outstanding"
              value={formatCurrencyWhole(totalOutstanding)}
              icon={<Landmark className="size-6" />}
              iconClassName="text-primary"
              decorClassName="bg-primary/5"
              footnote={
                <span>Across {duesCustomers.length} customers with dues</span>
              }
            />
            <StatCard
              label="Customers with Dues"
              value={duesCustomers.length.toString()}
              icon={<Users className="size-6" />}
              iconClassName="text-secondary"
              decorClassName="bg-secondary-container/30"
              footnote={
                <span>
                  {duesCustomers.filter((c) => c.overdue).length} currently overdue
                </span>
              }
            />
            <StatCard
              label="Oldest Due"
              value={`${oldestDue} days`}
              icon={<CalendarClock className="size-6" />}
              iconClassName="text-tertiary"
              decorClassName="bg-tertiary-container/10"
              footnote={<span>From the oldest unpaid invoice</span>}
            />
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
                placeholder="Search customer or invoice..."
                className="h-12 w-full rounded-lg border border-outline-variant bg-surface pr-4 pl-10 font-label-md text-label-md text-on-surface transition-shadow placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="no-scrollbar flex overflow-x-auto rounded-lg bg-surface-container-high p-1">
                {presetPills.map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => handlePresetPill(pill.value)}
                    className={cn(
                      'min-h-10 whitespace-nowrap rounded-md px-4 font-label-md text-label-md transition-all',
                      preset === pill.value
                        ? 'bg-surface-container-lowest text-on-secondary-container shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-lowest/60 hover:text-on-surface'
                    )}
                  >
                    {pill.label}
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

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="hidden grid-cols-12 gap-4 border-b border-outline-variant bg-surface-container-low px-6 py-4 font-label-md text-label-md tracking-wider text-on-surface-variant uppercase md:grid">
              <div className="col-span-5">Customer</div>
              <div className="col-span-3 text-right">Total Due</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-center">Invoices</div>
            </div>

            <div className="flex flex-col">
              {filtered.length === 0 ? (
                <div className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                  {isEmpty
                    ? 'No outstanding dues. All caught up!'
                    : 'No customers match your search or filters.'}
                </div>
              ) : (
                filtered.map((customer) => {
                  const isOpen = expanded.has(String(customer.customerId))
                  return (
                    <div key={customer.customerId} className="border-b border-outline-variant last:border-b-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggle(customer.customerId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggle(customer.customerId)
                          }
                        }}
                        className="group grid min-h-16 cursor-pointer grid-cols-1 items-center gap-4 px-6 py-4 transition-colors hover:bg-surface md:grid-cols-12"
                      >
                        <div className="col-span-12 flex items-center justify-between gap-3 md:col-span-5 md:justify-start">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-variant text-sm font-bold',
                                avatarStyles[customer.tone % avatarStyles.length]
                              )}
                            >
                              {initials(customer.customer)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-body-md text-body-md font-medium text-on-surface">
                                {customer.customer}
                              </div>
                              <div className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                                {customer.invoices.length} open invoice
                                {customer.invoices.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-12 flex items-center justify-between md:col-span-3 md:justify-end">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                            Total Due
                          </span>
                          <span className="font-label-md text-label-md font-bold text-on-surface">
                            {formatCurrency(customer.totalDue)}
                          </span>
                        </div>
                        <div className="col-span-12 flex items-center justify-between md:col-span-2 md:justify-center">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                            Status
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold',
                              customer.overdue
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-tertiary-container text-on-tertiary-container'
                            )}
                          >
                            {customer.overdue ? 'Overdue' : 'Action Required'}
                          </span>
                        </div>
                        <div className="col-span-12 flex items-center justify-between gap-2 md:col-span-2 md:justify-center">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                            Invoices
                          </span>
                          <ChevronDown
                            className={cn(
                              'size-5 text-on-surface-variant transition-transform duration-200',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="border-t border-outline-variant bg-surface-container-lowest/60 px-6 py-2">
                          {customer.invoices.map(({ invoice, statusLabel }) => (
                            <div
                              key={invoice.id}
                              className="grid grid-cols-1 items-center gap-4 border-b border-outline-variant py-4 last:border-b-0 md:grid-cols-12"
                            >
                              <div className="col-span-12 flex items-center justify-between gap-3 md:col-span-5 md:justify-start md:pl-2">
                                <div className="flex min-w-0 flex-col gap-1">
                                  <span className="font-label-md text-label-md font-bold text-on-surface">
                                    #{invoice.invoiceNumber}
                                  </span>
                                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                                    {invoice.period}
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-12 flex items-center justify-between md:col-span-3 md:justify-end">
                                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                                  Due
                                </span>
                                <span className="font-label-md text-label-md font-bold text-destructive">
                                  {formatCurrency(invoice.due)}
                                </span>
                              </div>
                              <div className="col-span-12 flex items-center justify-between md:col-span-2 md:justify-center">
                                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                                  Status
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold',
                                    invoiceStatusStyles[invoice.status]
                                  )}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="col-span-12 flex items-center justify-end md:col-span-2 md:justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="gap-2 rounded-lg px-3 font-label-md text-label-md text-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/invoice/${invoice.id}`)
                                  }}
                                >
                                  <Wallet className="size-4" />
                                  Record Payment
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-6 py-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Showing {filtered.length} of {duesCustomers.length} customers with dues
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  disabled
                  className="size-10 rounded border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-[18px]" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  disabled
                  className="size-10 rounded border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-[18px]" />
                </Button>
              </div>
            </div>
          </div>

          <div className="h-24 md:h-8" />
        </div>
      </main>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 border-l border-outline-variant bg-surface-container-lowest sm:max-w-[440px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-headline-md text-headline-md font-bold text-on-surface">
                    Filter Dues
                  </SheetTitle>
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                      {activeFilterCount} active
                    </span>
                  ) : null}
                </div>
                <SheetDescription className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                  Refine outstanding invoices by urgency, customer, status, and amount.
                </SheetDescription>
              </div>
            </div>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Close"
                className="size-9 shrink-0 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                <X className="size-5" />
              </Button>
            </SheetClose>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <Bookmark className="size-4 text-primary" />
                Quick Views
              </span>
              <div className="flex flex-wrap gap-2">
                {presetPills.map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => handlePresetPill(pill.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm transition-colors',
                      preset === pill.value
                        ? 'bg-primary-fixed font-semibold text-on-primary-fixed'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <CalendarClock className="size-4 text-primary" />
                Aging
              </span>
              <div className="grid grid-cols-1 gap-2">
                {agingOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container-low p-2.5 hover:bg-surface-container"
                  >
                    <input
                      type="checkbox"
                      checked={aging.includes(option.value)}
                      onChange={() => toggleAging(option.value)}
                      className="size-4 accent-primary"
                    />
                    <span className={cn('size-2.5 rounded-full', option.dot)} />
                    <span className="font-headline-md text-label-sm text-on-surface">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <BadgeCheck className="size-4 text-primary" />
                Payment Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {paymentStatusOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container-low p-2.5 hover:bg-surface-container"
                  >
                    <input
                      type="checkbox"
                      checked={statuses.includes(option.value)}
                      onChange={() => toggleStatus(option.value)}
                      className="size-4 accent-primary"
                    />
                    <span className={cn('size-2.5 rounded-full', option.dot)} />
                    <span className="font-headline-md text-label-sm text-on-surface">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                  <Users className="size-4 text-primary" />
                  Customer &amp; Account
                </span>
                {customerIds.length > 0 ? (
                  <span className="font-label-sm text-label-sm font-semibold text-secondary">
                    {customerIds.length} Selected
                  </span>
                ) : null}
              </div>
              <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3 transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary">
                <Search className="size-4 shrink-0 text-outline" />
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search customer name or ID..."
                  className="w-full bg-transparent font-body-md text-label-sm text-on-surface outline-none placeholder:text-outline"
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-headline-md text-label-sm text-primary"
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
              <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded-lg bg-surface-container-low p-2">
                {filteredCustomers.length === 0 ? (
                  <div className="px-2 py-4 text-center font-body-md text-body-md text-on-surface-variant">
                    No customers found.
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-container"
                    >
                      <input
                        type="checkbox"
                        checked={customerIds.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="size-4 rounded accent-primary"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-headline-md text-label-sm text-on-surface">
                          {c.name}
                        </span>
                        <span className="font-label-sm text-[10px] text-on-surface-variant">
                          ID: #{c.id}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <Wallet className="size-4 text-primary" />
                Due Amount Range
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Min:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-right font-label-sm text-label-sm text-on-surface outline-none"
                  />
                </div>
                <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Max:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="∞"
                    className="w-full bg-transparent text-right font-label-sm text-label-sm text-on-surface outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                  <CalendarDays className="size-4 text-primary" />
                  Due Date Window
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {dueWindowLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {dueWindowButtons.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDueWindow(option.value)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-center font-headline-md text-label-sm transition-colors',
                      dueWindow === option.value
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDueWindow('custom')}
                  className={cn(
                    'col-span-2 rounded-lg px-3 py-2 text-center font-headline-md text-label-sm transition-colors',
                    dueWindow === 'custom'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  Custom Date Range
                </button>
              </div>
              {dueWindow === 'custom' ? (
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dueFrom}
                      onChange={(e) => setDueFrom(e.target.value)}
                      className="h-10 rounded-lg bg-surface-container-low px-3 font-label-sm text-label-sm text-on-surface outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dueTo}
                      onChange={(e) => setDueTo(e.target.value)}
                      className="h-10 rounded-lg bg-surface-container-low px-3 font-label-sm text-label-sm text-on-surface outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <ArrowUpDown className="size-4 text-primary" />
                Sort By
              </span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low pr-8 pl-3 font-headline-md text-label-sm text-on-surface outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                >
                  {sortOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-outline" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest px-6 py-4 shadow-lg">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
              className="h-11 gap-2 rounded-lg bg-surface-container px-4 font-headline-md text-label-md text-on-surface hover:bg-surface-container-high"
            >
              <RotateCcw className="size-4" />
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="h-11 flex-1 gap-2 rounded-lg bg-primary px-5 font-headline-md text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container"
            >
              Apply Filters
              <span className="rounded-full bg-primary-container px-2 py-0.5 font-label-sm text-label-sm text-on-primary-container">
                {filtered.length.toLocaleString()} Results
              </span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}