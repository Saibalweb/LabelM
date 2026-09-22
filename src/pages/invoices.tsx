import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { BulkInvoiceDialog } from '@/components/invoices/BulkInvoiceDialog'
import { useAppSelector } from '@/store/hooks'
import { useInvoicesQuery } from '@/hooks/queries'
import { hasRole } from '@/lib/roles'
import type { Invoice, InvoiceStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type StatusFilter = 'All' | InvoiceStatus

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

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Invoices() {
  const navigate = useNavigate()
  const role = useAppSelector((state) => state.auth.user?.role)
  const canManage = hasRole(role, 'admin')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data: invoices = [], isPending: loading } = useInvoicesQuery({
    query: query.trim() || undefined,
    statuses: statusFilter === 'All' ? undefined : [statusFilter],
  })

  const handleGenerate = () => navigate('/invoice/new')
  const handleView = (invoice: Invoice) => navigate(`/invoice/${invoice.id}`)

  if (!loading && invoices.length === 0) {
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
                  {invoices.length === 0 ? (
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
                                avatarStyles[invoice.id % avatarStyles.length]
                              )}
                            >
                              {initials(invoice.customerName)}
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
              <span>Showing {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</span>
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
                  disabled
                  className="size-9 rounded p-2 text-outline hover:bg-surface-container-high disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BulkInvoiceDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  )
}