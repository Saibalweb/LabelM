import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Eye,
  Lock,
  Package,
  Pencil,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  useCustomersQuery,
  useLabelCountsByCustomerQuery,
  useLabelsQuery,
  useLabelStatsQuery,
} from '@/hooks/queries'
import { LabelEditDialog } from '@/components/labels/LabelEditDialog'
import { useAppSelector } from '@/store/hooks'
import { hasRole } from '@/lib/roles'
import { formatCurrency, formatDate } from '@/lib/format'
import type {
  BillingFilter,
  Label,
  LabelFilters,
  LabelSortKey,
  LabelStatus,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type DurationFilter = 'all' | 'today' | 'week' | 'month' | 'custom' | '48h'
type PresetId = 'unprinted' | 'highweight' | '48h'

const PAGE_SIZE = 25

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const durationButtons: { value: DurationFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

const presetList: { id: PresetId; label: string; Icon: LucideIcon }[] = [
  { id: 'unprinted', label: 'Unprinted Batches', Icon: Printer },
  { id: 'highweight', label: 'High-weight (>5kg)', Icon: Dumbbell },
  { id: '48h', label: 'Last 48 Hours', Icon: RefreshCw },
]

const statusOptions: { value: LabelStatus; label: string; dot: string }[] = [
  { value: 'printed', label: 'Printed', dot: 'bg-secondary' },
  { value: 'draft', label: 'In Queue', dot: 'bg-tertiary' },
]

const billingOptions: { value: BillingFilter; label: string; dot: string }[] = [
  { value: 'billed', label: 'Billed', dot: 'bg-secondary' },
  { value: 'unbilled', label: 'Unbilled', dot: 'bg-tertiary' },
]

const sortOptions: { value: LabelSortKey; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-desc', label: 'Amount: High → Low' },
  { value: 'amount-asc', label: 'Amount: Low → High' },
  { value: 'weight-desc', label: 'Weight: High → Low' },
  { value: 'customer-asc', label: 'Customer: A → Z' },
]

function durationBounds(
  duration: DurationFilter,
  fromDate: string,
  toDate: string
): { from: Date; to: Date } | null {
  const now = new Date()
  switch (duration) {
    case 'all':
      return null
    case 'today': {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      return { from, to }
    }
    case 'week': {
      const dow = now.getDay()
      const diff = dow === 0 ? 6 : dow - 1
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff + 7)
      return { from, to }
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from, to }
    }
    case '48h': {
      const from = new Date(Date.now() - 48 * 60 * 60 * 1000)
      const to = new Date(Date.now())
      return { from, to }
    }
    case 'custom': {
      if (!fromDate || !toDate) return null
      const from = new Date(`${fromDate}T00:00:00`)
      const to = new Date(`${toDate}T00:00:00`)
      to.setDate(to.getDate() + 1)
      return { from, to }
    }
  }
}

function StatCard({
  label,
  value,
  icon,
  iconClassName,
  decorClassName,
  footnote,
  footnoteClassName,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconClassName: string
  decorClassName: string
  footnote: React.ReactNode
  footnoteClassName: string
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
      <div className={cn('relative z-10 mt-2 flex items-center gap-1', footnoteClassName)}>
        {footnote}
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const role = useAppSelector((state) => state.auth.user?.role)
  const canEditLabels = hasRole(role, 'admin')
  const { data: customers = [] } = useCustomersQuery()
  const { data: stats } = useLabelStatsQuery()
  const { data: counts = [] } = useLabelCountsByCustomerQuery()
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [editLabel, setEditLabel] = useState<Label | null>(null)
  const [duration, setDuration] = useState<DurationFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerIds, setCustomerIds] = useState<number[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [statuses, setStatuses] = useState<LabelStatus[]>([])
  const [billing, setBilling] = useState<BillingFilter[]>([])
  const [minWeight, setMinWeight] = useState('')
  const [maxWeight, setMaxWeight] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState<LabelSortKey>('newest')
  const [page, setPage] = useState(1)

  const debouncedQuery = useDebouncedValue(query)
  const debouncedMinWeight = useDebouncedValue(minWeight)
  const debouncedMaxWeight = useDebouncedValue(maxWeight)
  const debouncedMinAmount = useDebouncedValue(minAmount)
  const debouncedMaxAmount = useDebouncedValue(maxAmount)

  const filters = useMemo<LabelFilters>(() => {
    const bounds = durationBounds(duration, fromDate, toDate)
    return {
      query: debouncedQuery.trim() || undefined,
      customerIds,
      statuses,
      billing,
      minWeight: debouncedMinWeight !== '' ? parseFloat(debouncedMinWeight) : null,
      maxWeight: debouncedMaxWeight !== '' ? parseFloat(debouncedMaxWeight) : null,
      minAmount: debouncedMinAmount !== '' ? parseFloat(debouncedMinAmount) : null,
      maxAmount: debouncedMaxAmount !== '' ? parseFloat(debouncedMaxAmount) : null,
      from: bounds ? toDateInput(bounds.from) : undefined,
      to: bounds ? toDateInput(bounds.to) : undefined,
    }
  }, [
    debouncedQuery,
    customerIds,
    statuses,
    billing,
    debouncedMinWeight,
    debouncedMaxWeight,
    debouncedMinAmount,
    debouncedMaxAmount,
    duration,
    fromDate,
    toDate,
  ])

  const {
    data: result,
    isPending: loading,
    isFetching,
  } = useLabelsQuery(filters, { page, pageSize: PAGE_SIZE, sortBy })
  const items = result?.data ?? []
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

  const customerLabelCounts = useMemo(() => {
    const countsMap: Record<number, number> = {}
    counts.forEach((c) => {
      countsMap[c.customerId] = c.count
    })
    return countsMap
  }, [counts])

  const dataRanges = useMemo(
    () => ({
      minW: stats?.minWeight ?? 0,
      maxW: stats?.maxWeight ?? 0,
      minA: stats?.minAmount ?? 0,
      maxA: stats?.maxAmount ?? 0,
    }),
    [stats]
  )

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
    if (billing.length > 0) count += 1
    if (minWeight !== '' || maxWeight !== '') count += 1
    if (minAmount !== '' || maxAmount !== '') count += 1
    return count
  }, [duration, customerIds, statuses, billing, minWeight, maxWeight, minAmount, maxAmount])

  const toggleCustomer = (id: number) => {
    setCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const toggleStatus = (s: LabelStatus) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const toggleBilling = (b: BillingFilter) => {
    setBilling((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
  }

  const isPresetActive = (id: PresetId): boolean => {
    if (id === 'unprinted') return statuses.length === 1 && statuses[0] === 'draft'
    if (id === 'highweight') {
      return minWeight !== '' && parseFloat(minWeight) === 5 && maxWeight === ''
    }
    return duration === '48h'
  }

  const applyPreset = (id: PresetId) => {
    if (isPresetActive(id)) {
      if (id === 'unprinted') setStatuses([])
      if (id === 'highweight') setMinWeight('')
      if (id === '48h') setDuration('all')
      return
    }
    if (id === 'unprinted') setStatuses(['draft'])
    if (id === 'highweight') {
      setMinWeight('5')
      setMaxWeight('')
    }
    if (id === '48h') setDuration('48h')
  }

  const durationLabel =
    duration === 'custom'
      ? 'Custom Range'
      : duration === '48h'
        ? 'Last 48 Hours'
        : durationButtons.find((o) => o.value === duration)?.label ?? 'All Time'

  const handleClearFilters = () => {
    setQuery('')
    setDuration('all')
    setFromDate('')
    setToDate('')
    setCustomerIds([])
    setCustomerQuery('')
    setStatuses([])
    setBilling([])
    setMinWeight('')
    setMaxWeight('')
    setMinAmount('')
    setMaxAmount('')
    setSortBy('newest')
  }

  const listStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const listEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)
  const hasNoLabels = !loading && total === 0 && activeFilterCount === 0 && query.trim() === ''

  return (
    <div className="flex h-full flex-col">
      <TopNav />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-background">
                Recent Labels
              </h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Review and manage your recently generated label history.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-2 rounded-full border-outline-variant bg-surface-container px-4 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
            >
              <Download className="size-[18px]" />
              Export
            </Button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard
              label="Total Labels"
              value={(stats?.totalLabels ?? 0).toLocaleString()}
              icon={<Package className="size-6" />}
              iconClassName="text-primary"
              decorClassName="bg-primary/5"
              footnote={
                <>
                  <TrendingUp className="size-4" />
                  <span className="font-label-sm text-label-sm">+12% this week</span>
                </>
              }
              footnoteClassName="text-secondary"
            />
            <StatCard
              label="Total Weight"
              value={`${(stats?.totalWeight ?? 0).toFixed(1)} kg`}
              icon={<Scale className="size-6" />}
              iconClassName="text-secondary"
              decorClassName="bg-secondary-container/30"
              footnote={
                <span className="font-label-sm text-label-sm">
                  Across {counts.length} customers
                </span>
              }
              footnoteClassName="text-on-surface-variant"
            />
            <StatCard
              label="Print Queue"
              value={(stats?.printQueue ?? 0).toString()}
              icon={<Printer className="size-6" />}
              iconClassName="text-tertiary"
              decorClassName="bg-tertiary-container/10"
              footnote={
                <span className="font-label-sm text-label-sm">Requires attention</span>
              }
              footnoteClassName="text-tertiary"
            />
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="relative w-full max-w-sm">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
                <Search className="size-5" />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer, SL No or date..."
                className="h-12 w-full rounded-lg border border-outline-variant bg-surface pr-4 pl-10 font-label-md text-label-md text-on-surface transition-shadow placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
              />
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

          {hasNoLabels ? (
            <EmptyState
              icon={<Tag className="size-9" />}
              title="No labels yet"
              description="Create your first label to start generating printable, trackable labels for your batches."
              actionLabel="Create your first label"
              onAction={() => navigate('/create')}
            />
          ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="hidden grid-cols-12 gap-4 border-b border-outline-variant bg-surface-container-low px-6 py-4 font-label-md text-label-md tracking-wider text-on-surface-variant uppercase md:grid">
              <div className="col-span-2">SL No</div>
              <div className="col-span-4">Customer / Rate</div>
              <div className="col-span-3">Date / Time</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            <div className="flex flex-col">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse border-b border-outline-variant bg-surface-container-lowest px-6 py-4" />
                ))
              ) : items.length === 0 ? (
                <div className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                  No labels match your search.
                </div>
              ) : (
                items.map((label) => (
                  <div
                    key={label.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/preview/${label.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/preview/${label.id}`)
                      }
                    }}
                    className="group grid min-h-16 cursor-pointer grid-cols-1 items-center gap-4 border-b border-outline-variant px-6 py-4 transition-colors last:border-b-0 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:grid-cols-12"
                  >
                    <div className="col-span-12 flex items-center justify-between md:col-span-2 md:justify-start">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                        SL No
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        #{label.slNo}
                      </span>
                    </div>
                    <div className="col-span-12 flex items-center justify-between md:col-span-4 md:justify-start">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                        Customer / Batch
                      </span>
                      <div>
                        <div className="font-body-md text-body-md font-medium text-on-surface">
                          {label.customerName || '—'}
                        </div>
                        <div className="mt-0.5 inline-block rounded bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                          {formatCurrency(label.rate)}/kg
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 flex items-center justify-between md:col-span-3 md:justify-start">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                        Date / Time
                      </span>
                      <div className="text-right md:text-left">
                        <div className="font-body-md text-body-md text-on-surface">
                          {formatDate(label.date)}
                        </div>
                        <div className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                          {new Date(label.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 flex items-center justify-between md:col-span-2 md:justify-end">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase md:hidden">
                        Amount
                      </span>
                      <span className="font-label-md text-label-md text-on-surface">
                        {formatCurrency(label.amount)}
                      </span>
                    </div>
                    <div className="col-span-12 flex items-center justify-end gap-2 transition-opacity md:col-span-1 md:opacity-0 md:group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high"
                        title="View Details"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/preview/${label.id}`)
                        }}
                      >
                        <Eye className="size-5" />
                      </Button>
                      {label.invoiceId != null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="size-10 rounded-full text-outline"
                          title="Invoiced label — locked"
                          aria-label="Invoiced label — locked"
                          onClick={(e) => {
                            e.stopPropagation()
                            toast.info('This label is billed to an invoice and cannot be edited.')
                          }}
                        >
                          <Lock className="size-5" />
                        </Button>
                      ) : canEditLabels ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                          title="Edit Label"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditLabel(label)
                          }}
                        >
                          <Pencil className="size-5" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high"
                        title="Print Again"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.info('Print again coming soon')
                        }}
                      >
                        <Printer className="size-5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-6 py-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
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
          )}

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
                    Filter Labels
                  </SheetTitle>
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                      {activeFilterCount} active
                    </span>
                  ) : null}
                </div>
                <SheetDescription className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                  Refine records by timeframe, customer, status, and value.
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
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                  <Bookmark className="size-4 text-primary" />
                  Saved Filter Presets
                </span>
                <button
                  type="button"
                  onClick={() => toast.info('Saved filter presets coming soon')}
                  className="cursor-pointer font-label-sm text-label-sm text-primary hover:underline"
                >
                  Manage
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {presetList.map((preset) => {
                  const active = isPresetActive(preset.id)
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm transition-colors',
                        active
                          ? 'bg-primary-fixed font-semibold text-on-primary-fixed'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      )}
                    >
                      <preset.Icon className="size-3.5" />
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                  <CalendarDays className="size-4 text-primary" />
                  Timeframe &amp; Duration
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
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
                      'rounded-lg px-3 py-2 text-center font-headline-md text-label-sm transition-colors',
                      duration === option.value
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDuration('custom')}
                  className={cn(
                    'col-span-2 rounded-lg px-3 py-2 text-center font-headline-md text-label-sm transition-colors',
                    duration === 'custom'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  Custom Date Range
                </button>
              </div>
              {duration === 'custom' ? (
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-10 rounded-lg bg-surface-container-low px-3 font-label-sm text-label-sm text-on-surface outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-10 rounded-lg bg-surface-container-low px-3 font-label-sm text-label-sm text-on-surface outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : null}
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
                          ID: #{c.id} • {customerLabelCounts[c.id] ?? 0} labels
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
                <BadgeCheck className="size-4 text-primary" />
                Label Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((option) => (
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
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <ReceiptText className="size-4 text-primary" />
                Billing &amp; Invoices
              </span>
              <div className="grid grid-cols-2 gap-2">
                {billingOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container-low p-2.5 hover:bg-surface-container"
                  >
                    <input
                      type="checkbox"
                      checked={billing.includes(option.value)}
                      onChange={() => toggleBilling(option.value)}
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
                <Scale className="size-4 text-primary" />
                Weight (KG) &amp; Total Value
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Weight Range
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                    {minWeight || dataRanges.minW.toFixed(1)} kg —{' '}
                    {maxWeight || dataRanges.maxW.toFixed(1)} kg
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Min:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minWeight}
                      onChange={(e) => setMinWeight(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-right font-label-sm text-label-sm text-on-surface outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">kg</span>
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Max:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value)}
                      placeholder="∞"
                      className="w-full bg-transparent text-right font-label-sm text-label-sm text-on-surface outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">kg</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Price / Value Range
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                    {formatCurrency(minAmount ? Number(minAmount) : dataRanges.minA)} —{' '}
                    {formatCurrency(maxAmount ? Number(maxAmount) : dataRanges.maxA)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent font-label-sm text-label-sm text-on-surface outline-none"
                    />
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="∞"
                      className="w-full bg-transparent font-label-sm text-label-sm text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-surface-container-high" />

            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase">
                <ArrowUpDown className="size-4 text-primary" />
                Sort By
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as LabelSortKey)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low pr-8 pl-3 font-headline-md text-label-sm text-on-surface outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
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
                {total.toLocaleString()} Results
              </span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <LabelEditDialog
        open={editLabel != null}
        onOpenChange={(open) => {
          if (!open) setEditLabel(null)
        }}
        label={editLabel}
      />
    </div>
  )
}