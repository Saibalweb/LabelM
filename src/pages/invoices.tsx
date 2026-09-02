import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Search,
} from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

type InvoiceStatus = 'Paid' | 'Unpaid' | 'Partial'
type StatusFilter = 'All' | InvoiceStatus

interface Invoice {
  id: string
  customer: string
  tone: number
  invoiceId: string
  period: string
  total: number
  paid: number
  due: number
  status: InvoiceStatus
  generatedOn: string
}

const filters: StatusFilter[] = ['All', 'Unpaid', 'Partial', 'Paid']

const avatarStyles = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-primary-fixed-dim text-on-primary-fixed',
]

const statusPillStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-secondary-container text-on-secondary-container',
  Unpaid: 'bg-destructive/10 text-destructive',
  Partial: 'bg-tertiary-container text-on-tertiary-container',
}

const demoInvoices: Invoice[] = [
  {
    id: 'inv-1',
    customer: 'Acme Corp',
    tone: 0,
    invoiceId: 'INV-2026-0042',
    period: 'Oct 1 - Oct 31, 2026',
    total: 12450,
    paid: 12450,
    due: 0,
    status: 'Paid',
    generatedOn: 'Nov 01, 2026',
  },
  {
    id: 'inv-2',
    customer: 'Global Logistics',
    tone: 1,
    invoiceId: 'INV-2026-0043',
    period: 'Oct 1 - Oct 31, 2026',
    total: 8900.5,
    paid: 0,
    due: 8900.5,
    status: 'Unpaid',
    generatedOn: 'Nov 02, 2026',
  },
  {
    id: 'inv-3',
    customer: 'TechFlow Inc',
    tone: 2,
    invoiceId: 'INV-2026-0044',
    period: 'Sep 15 - Oct 15, 2026',
    total: 24000,
    paid: 10000,
    due: 14000,
    status: 'Partial',
    generatedOn: 'Oct 16, 2026',
  },
  {
    id: 'inv-4',
    customer: 'Nexus Retail',
    tone: 3,
    invoiceId: 'INV-2026-0045',
    period: 'Oct 1 - Oct 31, 2026',
    total: 3200,
    paid: 3200,
    due: 0,
    status: 'Paid',
    generatedOn: 'Nov 03, 2026',
  },
  {
    id: 'inv-5',
    customer: 'BluePeak Industries',
    tone: 0,
    invoiceId: 'INV-2026-0046',
    period: 'Oct 1 - Oct 31, 2026',
    total: 18750,
    paid: 7500,
    due: 11250,
    status: 'Partial',
    generatedOn: 'Nov 04, 2026',
  },
  {
    id: 'inv-6',
    customer: 'Orbit Exports',
    tone: 1,
    invoiceId: 'INV-2026-0047',
    period: 'Sep 1 - Sep 30, 2026',
    total: 5400,
    paid: 5400,
    due: 0,
    status: 'Paid',
    generatedOn: 'Oct 02, 2026',
  },
  {
    id: 'inv-7',
    customer: 'Vertex Traders',
    tone: 2,
    invoiceId: 'INV-2026-0048',
    period: 'Sep 1 - Sep 30, 2026',
    total: 16200.75,
    paid: 0,
    due: 16200.75,
    status: 'Unpaid',
    generatedOn: 'Oct 05, 2026',
  },
  {
    id: 'inv-8',
    customer: 'Summit Foods',
    tone: 3,
    invoiceId: 'INV-2026-0049',
    period: 'Aug 1 - Aug 31, 2026',
    total: 9800,
    paid: 9800,
    due: 0,
    status: 'Paid',
    generatedOn: 'Sep 01, 2026',
  },
  {
    id: 'inv-9',
    customer: 'Quantum Pharma',
    tone: 0,
    invoiceId: 'INV-2026-0050',
    period: 'Aug 1 - Aug 31, 2026',
    total: 22100,
    paid: 12100,
    due: 10000,
    status: 'Partial',
    generatedOn: 'Sep 04, 2026',
  },
  {
    id: 'inv-10',
    customer: 'Stellar Motors',
    tone: 1,
    invoiceId: 'INV-2026-0051',
    period: 'Aug 1 - Aug 31, 2026',
    total: 7600,
    paid: 0,
    due: 7600,
    status: 'Unpaid',
    generatedOn: 'Sep 06, 2026',
  },
]

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Invoices() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return demoInvoices.filter((invoice) => {
      const matchesStatus =
        statusFilter === 'All' || invoice.status === statusFilter
      const matchesQuery =
        !q ||
        invoice.customer.toLowerCase().includes(q) ||
        invoice.invoiceId.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [query, statusFilter])

  const handleGenerate = () => toast.info('Invoice generation coming soon')
  const handleView = (invoice: Invoice) =>
    toast.info(`${invoice.invoiceId} details coming soon`)

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
            <Button
              type="button"
              onClick={handleGenerate}
              className="h-[52px] min-h-[52px] gap-2 rounded-lg px-6 font-label-md text-label-md"
            >
              <Plus className="size-5" />
              Generate Invoice
            </Button>
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
              <div className="relative min-w-[180px]">
                <select
                  className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface pr-10 pl-4 font-label-md text-label-md text-on-surface transition-shadow focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  defaultValue="This Month"
                >
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>Last 3 Months</option>
                  <option>This Year</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant">
                  <ChevronDown className="size-5" />
                </span>
              </div>

              <div className="no-scrollbar flex overflow-x-auto rounded-lg bg-surface-container-high p-1">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={cn(
                      'min-h-10 whitespace-nowrap rounded-md px-4 font-label-md text-label-md transition-all',
                      statusFilter === filter
                        ? 'bg-surface-container-lowest text-on-secondary-container shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-lowest/60 hover:text-on-surface'
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center font-body-md text-body-md text-on-surface-variant">
                        No invoices match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-outline-variant transition-colors last:border-b-0 hover:bg-surface-container-low"
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-variant text-sm font-bold',
                                avatarStyles[invoice.tone % avatarStyles.length]
                              )}
                            >
                              {initials(invoice.customer)}
                            </div>
                            <span className="font-semibold text-on-background">
                              {invoice.customer}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 font-label-md text-label-md text-on-surface-variant">
                          {invoice.invoiceId}
                        </td>
                        <td className="p-6 text-on-surface-variant">{invoice.period}</td>
                        <td className="p-6 text-right font-label-md text-label-md font-medium text-on-background">
                          {formatCurrency(invoice.total)}
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
                          {invoice.generatedOn}
                        </td>
                        <td className="p-6 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            className="size-10 rounded-full text-on-surface-variant hover:bg-primary-fixed hover:text-primary"
                            aria-label={`View ${invoice.invoiceId}`}
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
              <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <select className="cursor-pointer appearance-none rounded border border-outline-variant bg-surface py-1 pr-6 pl-2 font-label-sm text-label-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div className="flex items-center gap-6">
                <span>
                  Showing 1-{filtered.length} of {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    disabled
                    className="size-9 rounded p-2 text-outline hover:bg-surface-container-high disabled:opacity-50"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="size-9 rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
