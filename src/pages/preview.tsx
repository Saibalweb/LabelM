import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileText, Lock, Pencil, Printer } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { LabelEditDialog } from '@/components/labels/LabelEditDialog'
import { LabelPrintCard } from '@/components/labels/LabelPrintCard'
import {
  useAppSettingsQuery,
  useCompanyProfileQuery,
  useLabelQuery,
  useUpdateLabel,
} from '@/hooks/queries'
import { exportLabelPdf } from '@/lib/documentPdf'
import { runLabelPrint } from '@/lib/printDocument'

export function Preview() {
  const { id } = useParams<{ id: string }>()
  const { data: label, isPending: loading } = useLabelQuery(Number(id))
  const { data: company } = useCompanyProfileQuery()
  const { data: settings } = useAppSettingsQuery()
  const updateLabel = useUpdateLabel()
  const [editOpen, setEditOpen] = useState(false)

  const billed = label?.invoiceId != null
  const dims = settings
    ? { widthMm: settings.labelWidthMm, heightMm: settings.labelHeightMm }
    : {}

  const handlePrint = () => {
    if (!label) return
    if (label.status === 'draft') {
      updateLabel.mutate({ id: label.id, patch: { status: 'printed' } })
    }
    runLabelPrint('printLabel', dims)
  }

  const handlePdf = async () => {
    if (!label) return
    try {
      await exportLabelPdf(label, {
        ...dims,
        company,
        options: settings?.labelOptions,
      })
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to generate PDF.')
    }
  }

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

      <main className="flex flex-1 flex-col gap-8 overflow-y-auto bg-surface-bright p-4 md:p-8 lg:flex-row lg:items-center">
        <div id='printLabel' className="flex flex-1 items-start justify-center">
          <div className="label-sheet flex w-full justify-center">
            <LabelPrintCard label={label} company={company} options={settings?.labelOptions} />
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
              {billed ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="min-h-[52px] w-full gap-3 rounded-xl border-outline-variant font-label-md text-label-md text-on-surface-variant"
                >
                  <Lock className="size-5" />
                  Invoiced — Locked
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  className="min-h-[52px] w-full gap-3 rounded-xl border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-primary hover:bg-surface-container-low hover:text-primary"
                >
                  <Pencil className="size-5" />
                  Edit Label
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handlePdf}
                className="min-h-[52px] w-full gap-3 rounded-xl border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-primary hover:bg-surface-container-low hover:text-primary"
              >
                <Download className="size-5" />
                Download PDF
              </Button>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 lg:flex">
            <FileText className="size-5 text-on-surface-variant" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {label.customerName ? `Customer: ${label.customerName}` : 'Walk-in customer'}
            </span>
          </div>
        </div>
      </main>

      <LabelEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        label={label}
      />
    </div>
  )
}