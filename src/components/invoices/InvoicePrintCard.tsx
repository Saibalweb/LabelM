import { Layers } from 'lucide-react'
import { DEFAULT_INVOICE_OPTIONS } from '@/lib/documentOptions'
import { resolveInvoiceCustomer } from '@/lib/invoiceDocument'
import { formatCurrency, formatDate } from '@/lib/format'
import type { CompanyProfile, Invoice, InvoiceOptions } from '@/lib/types'

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-left font-label-md text-label-md text-on-surface-variant">
        {label}
      </span>
      <span className="text-right font-label-md text-label-md font-bold text-on-surface">
        {value}
      </span>
    </>
  )
}

function toAmount(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * The invoice document markup shared by the details page, bulk print, and (via
 * the same layout logic) the A4 PDF. Wrap it in `.invoice-sheet` inside the
 * area passed to `runInvoicePrint` to print.
 */
export function InvoicePrintCard({
  invoice,
  company,
  options = DEFAULT_INVOICE_OPTIONS,
}: {
  invoice: Invoice
  company: CompanyProfile
  options?: InvoiceOptions
}) {
  const customer = resolveInvoiceCustomer(invoice)

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">
      <div className="mb-12 flex flex-col justify-between gap-6 border-b border-surface-variant pb-8 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded bg-primary text-on-primary">
            <Layers className="size-7" />
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              {company.companyName || 'My Company'}
            </h2>
            {options.showTagline && company.tagline ? (
              <p className="font-label-md text-label-md text-on-surface-variant">
                {company.tagline}
              </p>
            ) : null}
            {options.showAddress && company.address ? (
              <p className="mt-1 max-w-xs whitespace-pre-line font-label-sm text-label-sm text-on-surface-variant">
                {company.address}
              </p>
            ) : null}
            {options.showPhones && company.phones.length > 0 ? (
              <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                {company.phones
                  .map((phone) => `${phone.label ? `${phone.label}: ` : ''}${phone.value}`)
                  .join(' · ')}
              </p>
            ) : null}
            {options.showEmail && company.email ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {company.email}
              </p>
            ) : null}
            {options.showWebsite && company.website ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {company.website}
              </p>
            ) : null}
            {options.showGst && company.gstNumber ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                GSTIN: {company.gstNumber}
              </p>
            ) : null}
            {options.showContactPerson && company.contactPerson ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {company.contactPerson}
              </p>
            ) : null}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <MetaRow label="Invoice No:" value={`#${invoice.invoiceNumber}`} />
            <MetaRow label="Date Issued:" value={formatDate(invoice.createdAt)} />
            {options.showDueDate ? (
              <MetaRow
                label="Due Date:"
                value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
              />
            ) : null}
            <MetaRow label="Billing Period:" value={invoice.billingPeriod} />
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="mb-3 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
          Bill To
        </h3>
        <div className="mb-1 font-headline-md text-headline-md text-on-surface">
          {customer.name}
        </div>
        {customer.address ? (
          <p className="font-body-md text-body-md text-on-surface">
            {customer.address.split('\n').map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : null}
        <p className="mt-2 font-label-md text-label-md text-on-surface-variant">
          {customer.email}
          <br />
          {customer.phone}
        </p>
      </div>

      <div className="mb-10 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-outline-variant">
              <th className="w-12 px-2 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase">
                Sl No
              </th>
              <th className="px-2 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase">
                Date
              </th>
              <th className="px-2 py-4 text-right font-label-sm text-label-sm text-on-surface-variant uppercase">
                Weight (g)
              </th>
              <th className="px-2 py-4 text-right font-label-sm text-label-sm text-on-surface-variant uppercase">
                Rate (₹)
              </th>
              <th className="px-2 py-4 text-right font-label-sm text-label-sm text-on-surface-variant uppercase">
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody className="font-label-md text-label-md text-on-surface">
            {invoice.lineItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <td className="px-2 py-4">{item.slNo}</td>
                <td className="px-2 py-4">{formatDate(item.date)}</td>
                <td className="px-2 py-4 text-right">{toAmount(item.weightG)}</td>
                <td className="px-2 py-4 text-right">{toAmount(item.rate)}</td>
                <td className="px-2 py-4 text-right font-bold">{toAmount(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-64 border-t-2 border-outline-variant pt-4">
          <div className="mb-4 flex justify-between font-label-md text-label-md">
            <span className="text-on-surface-variant">Total Weight</span>
            <span className="text-on-surface">{toAmount(invoice.totalWeight)} g</span>
          </div>
          <div className="flex items-center justify-between border-t border-surface-variant pt-4">
            <span className="font-headline-md text-headline-md text-on-surface">Total</span>
            <span className="text-[20px] font-bold text-primary">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
