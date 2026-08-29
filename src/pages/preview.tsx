import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileText, Printer, QrCode, Share2 } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchLabels, updateLabel } from '@/store/slices/labelsSlice'
import { formatCurrency, formatDate } from '@/lib/format'

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 font-label-sm text-label-sm text-outline uppercase">{label}</span>
      <span className="font-label-md text-label-md font-bold text-on-surface">{value}</span>
    </div>
  )
}

export function Preview() {
  const dispatch = useAppDispatch()
  const { id } = useParams<{ id: string }>()
  const { items, status } = useAppSelector((state) => state.labels)

  useEffect(() => {
    if (status === 'idle' || status === 'failed') {
      dispatch(fetchLabels())
    }
  }, [status, dispatch])

  const label = items.find((item) => item.id === id)

  const handlePrint = () => {
    if (!label) return
    if (label.status === 'draft') {
      dispatch(updateLabel({ id: label.id, patch: { status: 'printed' } }))
    }
    window.print()
  }

  const handlePdf = () => toast.info('PDF download coming soon')
  const handleWhatsApp = () => toast.info('WhatsApp sharing coming soon')

  if (!label) {
    return (
      <div className="flex h-full flex-col">
        <TopNav title="Label Preview" backTo="/" />
        <main className="flex flex-1 items-center justify-center bg-surface-bright p-8">
          <p className="font-body-md text-body-md text-on-surface-variant">
            {status === 'loading' ? 'Loading label...' : 'Label not found.'}
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Label Preview" backTo="/" />

      <main className="flex flex-1 flex-col gap-8 overflow-y-auto bg-surface-bright p-4 md:p-8 lg:flex-row print-area">
        <div className="flex flex-1 items-start justify-center lg:items-center">
          <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
            <div className="bg-barcode absolute top-0 left-0 h-6 w-full" />

            <div className="mt-6 mb-6 flex items-start justify-between border-b border-outline-variant pb-6">
              <div>
                <h3 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface uppercase">
                  {label.productId}
                </h3>
                <p className="mt-2 font-label-md text-label-md text-on-surface-variant uppercase">
                  {label.batch || 'Standard Batch'}
                </p>
              </div>
              <div className="flex size-24 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container-highest p-1">
                <QrCode className="size-20 text-on-surface" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <Detail label="Product ID" value={label.productId} />
              <Detail label="Batch Number" value={label.batch || '—'} />
              <Detail label="Manufacture Date" value={formatDate(label.date)} />
              <Detail label="Expiration Date" value={label.expDate || '—'} />
              <div className="col-span-2 flex flex-col">
                <span className="mb-1 font-label-sm text-label-sm text-outline uppercase">
                  Warning Details
                </span>
                <p className="font-body-md text-body-md leading-tight text-on-surface">
                  {label.description || 'No additional details provided.'}
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between border-t border-outline-variant pt-6">
              <div className="flex gap-2">
                <span className="rounded bg-surface-container-highest px-2 py-1 font-label-sm text-label-sm text-on-surface uppercase">
                  {formatCurrency(label.mrpPerKg)}/kg
                </span>
                <span className="rounded bg-surface-container-highest px-2 py-1 font-label-sm text-label-sm text-on-surface uppercase">
                  {label.totalWeightKg} kg
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-outline">
                {label.slNo} / {formatDate(label.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-80 print:hidden">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h4 className="mb-6 border-b border-outline-variant pb-4 font-headline-md text-headline-md text-on-surface">
              Actions
            </h4>
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handlePrint}
                className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-secondary font-label-md text-label-md font-bold text-on-secondary shadow-sm transition-opacity hover:opacity-90"
              >
                <Printer className="size-5" />
                Print Label
              </button>
              <button
                type="button"
                onClick={handlePdf}
                className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-primary transition-colors hover:bg-surface-container-low"
              >
                <Download className="size-5" />
                Download PDF
              </button>
              <div className="my-2 h-px w-full bg-outline-variant" />
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <Share2 className="size-5" />
                Share via WhatsApp
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h4 className="font-label-sm text-label-sm tracking-wider text-outline uppercase">
              Printer Status
            </h4>
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-secondary" />
              <span className="font-body-md text-body-md text-on-surface">Zebra ZT411 Ready</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Queue: 0 jobs
            </span>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 lg:flex">
            <FileText className="size-5 text-on-surface-variant" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {label.customerName ? `Customer: ${label.customerName}` : 'Walk-in customer'}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}