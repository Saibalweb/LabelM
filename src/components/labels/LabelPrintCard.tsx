import { formatCurrency, formatDate } from '@/lib/format'
import { DEFAULT_LABEL_OPTIONS } from '@/lib/documentOptions'
import type { CompanyProfile, Label, LabelOptions } from '@/lib/types'

/**
 * The label markup shared by the preview page, the dashboard's one-click
 * print, and bulk print/PDF. Wrap it in an element with class `label-sheet`
 * (inside the area passed to `runLabelPrint`) to print. Dimensions and which
 * fields render are driven by `app_settings` via the `options` prop.
 */
export function LabelPrintCard({
  label,
  company,
  options = DEFAULT_LABEL_OPTIONS,
}: {
  label: Label
  company?: CompanyProfile | null
  options?: LabelOptions
}) {
  const companyName = company?.companyName || 'My Company'
  const labelPhone = company?.phones.find((phone) => phone.showOnLabel) ?? company?.phones[0]
  const hasDetails =
    options.showDate || options.showWeight || options.showAmount || options.showRate

  return (
    <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center shadow-sm">
      <div className="space-y-2">
        {options.showCompanyName ? (
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface uppercase md:text-4xl">
            {companyName}
          </h2>
        ) : null}
        {options.showCustomerName ? (
          <p className="font-label-md font-semibold tracking-widest text-on-surface-variant uppercase">
            {label.customerName ? label.customerName : 'Walk-in Customer'}
          </p>
        ) : null}
        {options.showSlNo ? (
          <p className="font-label-md font-semibold tracking-widest text-on-surface-variant">
            SL No: {label.slNo}
          </p>
        ) : null}
      </div>
      {hasDetails ? (
        <div className="mt-8 space-y-3">
          {options.showDate ? (
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-label-md font-medium tracking-wider text-outline uppercase">
                DATE -
              </span>
              <span className="text-lg font-bold text-on-surface">{formatDate(label.date)}</span>
            </div>
          ) : null}
          {options.showWeight ? (
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-label-md font-medium tracking-wider text-outline uppercase">
                WT (kg) -
              </span>
              <span className="text-lg font-bold text-on-surface">{label.weight}</span>
            </div>
          ) : null}
          {options.showRate ? (
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-label-md font-medium tracking-wider text-outline uppercase">
                RATE -
              </span>
              <span className="text-lg font-bold text-on-surface">
                {formatCurrency(label.rate)}/kg
              </span>
            </div>
          ) : null}
          {options.showAmount ? (
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-label-md font-medium tracking-wider text-outline uppercase">
                AMOUNT -
              </span>
              <span className="text-lg font-bold text-on-surface">
                {formatCurrency(label.amount)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {options.showPhone && labelPhone ? (
        <p className="mt-6 font-label-md font-semibold tracking-widest text-on-surface-variant">
          {labelPhone.value}
        </p>
      ) : null}
      {options.showAddress && company?.address ? (
        <p className="mt-2 max-w-xs font-label-sm text-label-sm text-on-surface-variant">
          {company.address}
        </p>
      ) : null}
    </div>
  )
}
