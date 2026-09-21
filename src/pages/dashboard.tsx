import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Package,
  Printer,
  Scale,
  Search,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Label as FormLabel } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCustomersQuery, useLabelsQuery } from '@/hooks/queries'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Customer } from '@/lib/types'
import { cn } from '@/lib/utils'

type DurationFilter = 'all' | 'today' | 'week' | 'month' | '30d' | 'year' | 'custom'

const durationOptions: { value: DurationFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
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
    case '30d': {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      return { from, to }
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1)
      const to = new Date(now.getFullYear() + 1, 0, 1)
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
  const { data: items = [], isPending: loading } = useLabelsQuery()
  const { data: customers = [] } = useCustomersQuery()
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [duration, setDuration] = useState<DurationFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerId, setCustomerId] = useState<'all' | number>('all')
  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) => String(c.id).includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [customers, customerQuery])

  const selectedCustomer: Customer | null =
    customerId === 'all' ? null : customers.find((c) => c.id === customerId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const bounds = durationBounds(duration, fromDate, toDate)
    return items.filter((label) => {
      const matchesQuery =
        !q ||
        [label.slNo, label.customerName, label.date]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q))
      const matchesCustomer = customerId === 'all' || label.customerId === customerId
      let matchesDate = true
      if (bounds) {
        const t = new Date(`${label.date}T00:00:00`).getTime()
        matchesDate = t >= bounds.from.getTime() && t < bounds.to.getTime()
      }
      return matchesQuery && matchesCustomer && matchesDate
    })
  }, [items, query, customerId, duration, fromDate, toDate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (duration !== 'all') count += 1
    if (customerId !== 'all') count += 1
    return count
  }, [duration, customerId])

  const selectCustomer = (id: 'all' | number) => {
    setCustomerId(id)
    setCustomerQuery('')
    setShowCustomerList(false)
  }

  const handleClearFilters = () => {
    setQuery('')
    setDuration('all')
    setFromDate('')
    setToDate('')
    setCustomerId('all')
    setCustomerQuery('')
    setShowCustomerList(false)
  }

  const totalWeight = useMemo(
    () => items.reduce((sum, label) => sum + label.weight, 0),
    [items]
  )
  const uniqueCustomers = useMemo(
    () => new Set(items.map((l) => l.customerName).filter(Boolean)).size,
    [items]
  )
  const printQueue = useMemo(() => items.filter((l) => l.status === 'draft').length, [items])

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
              value={items.length.toLocaleString()}
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
              value={`${totalWeight.toFixed(1)} kg`}
              icon={<Scale className="size-6" />}
              iconClassName="text-secondary"
              decorClassName="bg-secondary-container/30"
              footnote={
                <span className="font-label-sm text-label-sm">
                  Across {uniqueCustomers} customers
                </span>
              }
              footnoteClassName="text-on-surface-variant"
            />
            <StatCard
              label="Print Queue"
              value={printQueue.toString()}
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
              className="relative h-12 gap-2 rounded-lg border-outline-variant bg-surface px-5 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
            >
              <Filter className="size-[18px]" />
              Filter
              {activeFilterCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-label-sm text-label-sm font-bold text-on-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          {!loading && items.length === 0 ? (
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
              ) : filtered.length === 0 ? (
                <div className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                  No labels match your search.
                </div>
              ) : (
                filtered.map((label) => (
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
                Showing 1-{filtered.length} of {items.length}
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
          className="w-full border-l border-outline-variant bg-surface-container-lowest sm:max-w-sm"
        >
          <SheetHeader className="border-b border-outline-variant bg-surface-container-lowest">
            <SheetTitle className="font-headline-md text-headline-md text-on-surface">
              Filters
            </SheetTitle>
            <SheetDescription className="font-body-md text-body-md text-on-surface-variant">
              Narrow down your labels.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            <div>
              <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                Duration
              </FormLabel>
              <div className="relative">
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as DurationFilter)}
                  className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface pr-10 pl-4 font-label-md text-label-md text-on-surface transition-shadow focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant">
                  <ChevronDown className="size-5" />
                </span>
              </div>

              {duration === 'custom' ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel className="mb-1.5 block font-label-sm text-label-sm text-on-surface-variant">
                      From
                    </FormLabel>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 font-label-md text-label-md text-on-surface transition-shadow focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <FormLabel className="mb-1.5 block font-label-sm text-label-sm text-on-surface-variant">
                      To
                    </FormLabel>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 font-label-md text-label-md text-on-surface transition-shadow focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                Customer
              </FormLabel>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
                  <Search className="size-5" />
                </span>
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onFocus={() => setShowCustomerList(true)}
                  onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
                  placeholder="Search customer..."
                  className="h-12 w-full rounded-lg border border-outline-variant bg-surface pr-4 pl-10 font-label-md text-label-md text-on-surface transition-shadow placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {selectedCustomer ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
                  <div className="min-w-0">
                    <span className="block truncate font-body-md text-body-md font-medium text-on-surface">
                      {selectedCustomer.name}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      #{selectedCustomer.id}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Clear customer filter"
                    onClick={() => selectCustomer('all')}
                    className="shrink-0 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : null}

              {showCustomerList ? (
                <div className="absolute left-0 right-0 z-30 mt-2 flex max-h-64 flex-col overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCustomer('all')}
                    className={cn(
                      'flex h-auto w-full items-center justify-start gap-3 rounded-none border-b border-outline-variant px-4 py-3 text-left last:border-b-0 hover:bg-surface-container',
                      customerId === 'all' && 'bg-surface-container'
                    )}
                  >
                    <span className="font-label-md text-label-md text-on-surface">
                      All Customers
                    </span>
                  </Button>
                  {filteredCustomers.length === 0 ? (
                    <div className="px-4 py-6 text-center font-body-md text-body-md text-on-surface-variant">
                      No customers found.
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <Button
                        key={c.id}
                        type="button"
                        variant="ghost"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCustomer(c.id)}
                        className={cn(
                          'flex h-auto w-full items-center justify-start gap-3 rounded-none border-b border-outline-variant px-4 py-3 text-left last:border-b-0 hover:bg-surface-container',
                          customerId === c.id && 'bg-surface-container'
                        )}
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md font-bold text-on-primary-container">
                          {c.id}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-body-md text-body-md text-on-surface">
                            {c.name}
                          </span>
                          <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
                            {c.currentRate != null
                              ? `${formatCurrency(c.currentRate)}/kg`
                              : 'No rate'}
                          </span>
                        </span>
                      </Button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <SheetFooter className="border-t border-outline-variant bg-surface-container-lowest">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="h-12 w-full gap-2 rounded-lg font-label-md text-label-md"
            >
              Clear all
            </Button>
            <Button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="h-12 w-full gap-2 rounded-lg font-label-md text-label-md"
            >
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}