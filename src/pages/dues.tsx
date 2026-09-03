import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Search,
  Users,
  Wallet,
} from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import {
  demoInvoices,
  type Invoice,
  type InvoiceStatus,
} from '@/lib/demo/invoices'
import { formatCurrency, formatCurrencyWhole } from '@/lib/format'
import { cn } from '@/lib/utils'

type SortKey = 'Highest Due First' | 'Oldest First' | 'Name A-Z'

const sortOptions: SortKey[] = ['Highest Due First', 'Oldest First', 'Name A-Z']

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
  customer: string
  tone: number
  totalDue: number
  oldestDays: number
  overdue: boolean
  invoices: DuesInvoice[]
}

const DAY_MS = 86_400_000

function parseDate(value: string): Date {
  return new Date(`${value} 00:00:00`)
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
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
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('Highest Due First')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const referenceNow = useMemo(
    () =>
      Math.max(
        ...demoInvoices.map((inv) => parseDate(inv.dueDate).getTime())
      ),
    []
  )

  const customers = useMemo(() => {
    const byCustomer = new Map<string, DuesCustomer>()
    for (const invoice of demoInvoices) {
      if (invoice.due <= 0) continue
      const dueDate = parseDate(invoice.dueDate).getTime()
      const daysOverdue = Math.max(0, Math.floor((referenceNow - dueDate) / DAY_MS))
      const statusLabel =
        invoice.status === 'Partial'
          ? `Partial (${Math.round((invoice.paid / invoice.total) * 100)}%)`
          : 'Unpaid'
      const entry = byCustomer.get(invoice.customer) ?? {
        customer: invoice.customer,
        tone: invoice.tone,
        totalDue: 0,
        oldestDays: 0,
        overdue: false,
        invoices: [] as DuesInvoice[],
      }
      entry.totalDue += invoice.due
      entry.oldestDays = Math.max(entry.oldestDays, daysOverdue)
      if (daysOverdue > 0) entry.overdue = true
      entry.invoices.push({ invoice, daysOverdue, statusLabel })
      byCustomer.set(invoice.customer, entry)
    }
    return Array.from(byCustomer.values())
  }, [referenceNow])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = customers.filter(
      (c) =>
        !q ||
        c.customer.toLowerCase().includes(q) ||
        c.invoices.some(({ invoice }) =>
          invoice.invoiceId.toLowerCase().includes(q)
        )
    )
    const sorted = [...list]
    if (sort === 'Highest Due First') sorted.sort((a, b) => b.totalDue - a.totalDue)
    if (sort === 'Oldest First') sorted.sort((a, b) => b.oldestDays - a.oldestDays)
    if (sort === 'Name A-Z') sorted.sort((a, b) => a.customer.localeCompare(b.customer))
    return sorted
  }, [customers, query, sort])

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalDue, 0),
    [customers]
  )
  const oldestDue = useMemo(
    () => customers.reduce((max, c) => Math.max(max, c.oldestDays), 0),
    [customers]
  )

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

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
                <span>Across {customers.length} customers with dues</span>
              }
            />
            <StatCard
              label="Customers with Dues"
              value={customers.length.toString()}
              icon={<Users className="size-6" />}
              iconClassName="text-secondary"
              decorClassName="bg-secondary-container/30"
              footnote={
                <span>
                  {customers.filter((c) => c.overdue).length} currently overdue
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

            <div className="flex items-center gap-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Sort by:
              </span>
              <div className="relative min-w-[220px]">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface pr-10 pl-4 font-label-md text-label-md text-on-surface transition-shadow focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant">
                  <ChevronDown className="size-5" />
                </span>
              </div>
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
                  {customers.length === 0
                    ? 'No outstanding dues. All caught up!'
                    : 'No customers match your search.'}
                </div>
              ) : (
                filtered.map((customer) => {
                  const isOpen = expanded.has(customer.customer)
                  return (
                    <div key={customer.customer} className="border-b border-outline-variant last:border-b-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggle(customer.customer)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggle(customer.customer)
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
                                    #{invoice.invoiceId}
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
                Showing {filtered.length} of {customers.length} customers with dues
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

          <div className="h-24 md:h-8" />
        </div>
      </main>
    </div>
  )
}