import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Package,
  Layers,
  Printer,
  TrendingUp,
} from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { useAppSelector } from '@/store/hooks'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

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
  const { items, status } = useAppSelector((state) => state.labels)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((label) =>
      [label.slNo, label.batch, label.productId, label.customerName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    )
  }, [items, query])

  const totalBatches = useMemo(
    () => new Set(items.map((l) => l.batch).filter(Boolean)).size,
    [items]
  )
  const uniqueCustomers = useMemo(
    () => new Set(items.map((l) => l.customerName).filter(Boolean)).size,
    [items]
  )
  const printQueue = useMemo(() => items.filter((l) => l.status === 'draft').length, [items])

  const loading = status === 'loading' || status === 'idle'

  return (
    <div className="flex h-full flex-col">
      <TopNav
        searchable
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search labels..."
      />
      <MobileSearchBar value={query} onChange={setQuery} placeholder="Search labels..." />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-background">
                Recent Labels
              </h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Review and manage your recently generated label history.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-12 items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Filter className="size-[18px]" />
                Filter
              </button>
              <button
                type="button"
                className="flex h-12 items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Download className="size-[18px]" />
                Export
              </button>
            </div>
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
              label="Active Batches"
              value={totalBatches.toString()}
              icon={<Layers className="size-6" />}
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

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="hidden grid-cols-12 gap-4 border-b border-outline-variant bg-surface-container-low px-6 py-4 font-label-md text-label-md tracking-wider text-on-surface-variant uppercase md:grid">
              <div className="col-span-2">SL No</div>
              <div className="col-span-4">Customer / Batch</div>
              <div className="col-span-3">Date / Time</div>
              <div className="col-span-2 text-right">Total Price</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            <div className="flex flex-col">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse border-b border-outline-variant bg-surface-container-lowest px-6 py-4" />
                ))
              ) : filtered.length === 0 ? (
                <div className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                  {query ? 'No labels match your search.' : 'No labels yet. Create your first label.'}
                </div>
              ) : (
                filtered.map((label) => (
                  <div
                    key={label.id}
                    className="group grid min-h-16 grid-cols-1 items-center gap-4 border-b border-outline-variant px-6 py-4 transition-colors last:border-b-0 hover:bg-surface md:grid-cols-12"
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
                          {label.batch || '—'}
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
                        Total Price
                      </span>
                      <span className="font-label-md text-label-md text-on-surface">
                        {formatCurrency(label.totalPrice)}
                      </span>
                    </div>
                    <div className="col-span-12 flex items-center justify-end gap-2 transition-opacity md:col-span-1 md:opacity-0 md:group-hover:opacity-100">
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
                        title="View Details"
                        onClick={() => navigate(`/preview/${label.id}`)}
                      >
                        <Eye className="size-5" />
                      </button>
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
                        title="Print Again"
                        onClick={() => {
                          toast.info('Print again coming soon')
                        }}
                      >
                        <Printer className="size-5" />
                      </button>
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
                <button
                  type="button"
                  disabled
                  className="flex size-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-[18px]" />
                </button>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-[18px]" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-24 md:h-8" />
        </div>
      </main>
    </div>
  )
}