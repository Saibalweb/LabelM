import { formatCurrency, formatDate } from '@/lib/format'
import type { Label } from '@/lib/types'

/**
 * The 60×40mm label markup shared by the preview page and the dashboard's
 * one-click print. Wrap it in an element with id `printLabel` and call
 * `runLabelPrint('printLabel')` to print.
 */
export function LabelPrintCard({ label }: { label: Label }) {
  return (
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
          <span className="font-label-md font-medium tracking-wider text-outline uppercase">
            DATE -
          </span>
          <span className="text-lg font-bold text-on-surface">{formatDate(label.date)}</span>
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-label-md font-medium tracking-wider text-outline uppercase">
            WT (kg) -
          </span>
          <span className="text-lg font-bold text-on-surface">{label.weight}</span>
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-label-md font-medium tracking-wider text-outline uppercase">
            AMOUNT -
          </span>
          <span className="text-lg font-bold text-on-surface">
            {formatCurrency(label.amount)}
          </span>
        </div>
      </div>
    </div>
  )
}
