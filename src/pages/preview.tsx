import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileText, Printer, Share2 } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchLabels, updateLabel } from '@/store/slices/labelsSlice'
import { formatDate } from '@/lib/format'

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
  console.log('Preview label:', label)

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
          <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center shadow-sm">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface uppercase md:text-4xl">
                My Company Name
              </h2>
              <p className="font-label-md font-semibold tracking-widest text-on-surface-variant uppercase">
                {label.customerName ? label.customerName : 'Walk-in Customer'}
              </p>
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-label-md font-medium tracking-wider text-outline uppercase">DATE -</span>
                <span className="text-lg font-bold text-on-surface">{formatDate(label.date)}</span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-label-md font-medium tracking-wider text-outline uppercase">WT (gm) -</span>
                <span className="text-lg font-bold text-on-surface">{label.totalWeightKg}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-80 print:hidden">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h4 className="mb-6 border-b border-outline-variant pb-4 font-headline-md text-headline-md text-on-surface">
              Actions
            </h4>
            <div className="flex flex-col gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrint}
                className="min-h-[52px] w-full gap-3 rounded-xl font-label-md text-label-md font-bold shadow-sm"
              >
                <Printer className="size-5" />
                Print Label
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePdf}
                className="min-h-[52px] w-full gap-3 rounded-xl border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-primary hover:bg-surface-container-low hover:text-primary"
              >
                <Download className="size-5" />
                Download PDF
              </Button>
              <div className="my-2 h-px w-full bg-outline-variant" />
              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsApp}
                className="min-h-[52px] w-full gap-3 rounded-xl border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
              >
                <Share2 className="size-5" />
                Share via WhatsApp
              </Button>
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