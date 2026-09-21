import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileText, Printer, Share2 } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { useLabelQuery, useUpdateLabel } from '@/hooks/queries'
import { formatCurrency, formatDate } from '@/lib/format'

const LABEL_WIDTH_MM = 60
const LABEL_HEIGHT_MM = 40

const LABEL_PRINT_CSS = `
  @page {
    size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
    margin: 0;
  }

  html,
  body {
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  body * {
    visibility: hidden;
  }

  #printLabel,
  #printLabel * {
    visibility: visible;
  }

  #printLabel {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  #printLabel > div {
    width: 100% !important;
    height: 100% !importantf;
    max-width: none !important;
    margin: 0 !important;
    padding: 3mm !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #000000 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #printLabel h2 {
    font-size: 15px;
    line-height: 1.2;
    margin: 0;
    color: #000000 !important;
  }

  #printLabel p,
  #printLabel span {
    font-size: 10px;
    line-height: 1.3;
    color: #000000 !important;
  }

  #printLabel .mt-8 {
    margin-top: 2mm;
  }
`

export function Preview() {
  const { id } = useParams<{ id: string }>()
  const { data: label, isPending: loading } = useLabelQuery(Number(id))
  const updateLabel = useUpdateLabel()

  const handlePrint = () => {
    if (!label) return
    if (label.status === 'draft') {
      updateLabel.mutate({ id: label.id, patch: { status: 'printed' } })
    }

    const cleanup = () => {
      document.getElementById('label-print-css')?.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    const style = document.createElement('style')
    style.id = 'label-print-css'
    style.textContent = LABEL_PRINT_CSS
    document.head.appendChild(style)

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
            {loading ? 'Loading label...' : 'Label not found.'}
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Label Preview" backTo="/" />

      <main className="flex flex-1 flex-col gap-8 overflow-y-auto bg-surface-bright p-4 md:p-8 lg:flex-row">
        <div id='printLabel' className="flex flex-1 items-start justify-center lg:items-center">
          <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center shadow-sm">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface uppercase md:text-4xl">
                My Company Name
              </h2>
              <p className="font-label-md font-semibold tracking-widest text-on-surface-variant uppercase">
                {label.customerName ? label.customerName : 'Walk-in Customer'}
              </p>
              <p className="font-label-md font-semibold tracking-widest text-on-surface-variant">
                SL No: {label.slNo}
              </p>
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-label-md font-medium tracking-wider text-outline uppercase">DATE -</span>
                <span className="text-lg font-bold text-on-surface">{formatDate(label.date)}</span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-label-md font-medium tracking-wider text-outline uppercase">WT (kg) -</span>
                <span className="text-lg font-bold text-on-surface">{label.weight}</span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-label-md font-medium tracking-wider text-outline uppercase">AMOUNT -</span>
                <span className="text-lg font-bold text-on-surface">{formatCurrency(label.amount)}</span>
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