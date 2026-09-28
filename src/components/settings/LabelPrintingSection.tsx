import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAppSettingsQuery, useUpdateAppSettings } from '@/hooks/queries'
import { resolveLabelDimensions, LABEL_PRESETS, CUSTOM_PRESET_ID, validateLabelSize } from '@/lib/labelPresets'
import type { AppSettingsInput, InvoiceOptions, LabelOptions } from '@/lib/types'

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 font-sans text-[13px] text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

const LABEL_TOGGLES: { key: keyof LabelOptions; label: string }[] = [
  { key: 'showCompanyName', label: 'Company name' },
  { key: 'showCustomerName', label: 'Customer name' },
  { key: 'showSlNo', label: 'SL No' },
  { key: 'showDate', label: 'Date' },
  { key: 'showWeight', label: 'Weight' },
  { key: 'showRate', label: 'Rate' },
  { key: 'showAmount', label: 'Amount' },
  { key: 'showPhone', label: 'Phone' },
  { key: 'showAddress', label: 'Address' },
]

const INVOICE_TOGGLES: { key: keyof InvoiceOptions; label: string }[] = [
  { key: 'showTagline', label: 'Tagline' },
  { key: 'showAddress', label: 'Address' },
  { key: 'showGst', label: 'GSTIN' },
  { key: 'showPhones', label: 'Phone numbers' },
  { key: 'showEmail', label: 'Email' },
  { key: 'showWebsite', label: 'Website' },
  { key: 'showContactPerson', label: 'Contact person' },
  { key: 'showDueDate', label: 'Due date' },
]

function ToggleRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 px-3 py-2">
      <span className="font-sans text-[13px] text-on-surface">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function LabelPrintingSection({ canEdit }: { canEdit: boolean }) {
  const { data } = useAppSettingsQuery()
  const updateSettings = useUpdateAppSettings()
  const [form, setForm] = useState<AppSettingsInput | null>(null)

  useEffect(() => {
    if (!data) return
    setForm({
      labelPreset: data.labelPreset,
      labelWidthMm: data.labelWidthMm,
      labelHeightMm: data.labelHeightMm,
      labelPrefix: data.labelPrefix,
      invoicePrefix: data.invoicePrefix,
      autoMarkPrinted: data.autoMarkPrinted,
      labelOptions: data.labelOptions,
      invoiceOptions: data.invoiceOptions,
    })
  }, [data])

  if (!form) return null

  const validation = validateLabelSize(form.labelWidthMm, form.labelHeightMm)
  const isCustom = form.labelPreset === CUSTOM_PRESET_ID

  const handlePreset = (presetId: string) => {
    if (presetId === CUSTOM_PRESET_ID) {
      setForm((prev) => (prev ? { ...prev, labelPreset: CUSTOM_PRESET_ID } : prev))
      return
    }
    const dims = resolveLabelDimensions(presetId, form.labelWidthMm, form.labelHeightMm)
    setForm((prev) =>
      prev
        ? { ...prev, labelPreset: presetId, labelWidthMm: dims.widthMm, labelHeightMm: dims.heightMm }
        : prev
    )
  }

  const setDimension = (key: 'labelWidthMm' | 'labelHeightMm', raw: string) => {
    const value = Number(raw)
    setForm((prev) =>
      prev
        ? { ...prev, labelPreset: CUSTOM_PRESET_ID, [key]: Number.isFinite(value) ? value : 0 }
        : prev
    )
  }

  const setLabelOption = (key: keyof LabelOptions, value: boolean) =>
    setForm((prev) =>
      prev ? { ...prev, labelOptions: { ...prev.labelOptions, [key]: value } } : prev
    )

  const setInvoiceOption = (key: keyof InvoiceOptions, value: boolean) =>
    setForm((prev) =>
      prev ? { ...prev, invoiceOptions: { ...prev.invoiceOptions, [key]: value } } : prev
    )

  const handleSave = async () => {
    if (!validation.ok) {
      toast.error(validation.error ?? 'Invalid label size.')
      return
    }
    try {
      await updateSettings.mutateAsync(form)
      toast.success('Label & invoice settings saved')
    } catch {
      toast.error('Failed to save settings.')
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="font-sans text-[12px] font-medium text-on-surface-variant">
              Label size
            </span>
            <select
              className={inputClass}
              value={form.labelPreset}
              disabled={!canEdit}
              onChange={(e) => handlePreset(e.target.value)}
            >
              {LABEL_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              <option value={CUSTOM_PRESET_ID}>Custom</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-sans text-[12px] font-medium text-on-surface-variant">
              Width (mm)
            </span>
            <input
              type="number"
              min="1"
              step="0.5"
              className={inputClass}
              value={form.labelWidthMm}
              disabled={!canEdit || !isCustom}
              onChange={(e) => setDimension('labelWidthMm', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-sans text-[12px] font-medium text-on-surface-variant">
              Height (mm)
            </span>
            <input
              type="number"
              min="1"
              step="0.5"
              className={inputClass}
              value={form.labelHeightMm}
              disabled={!canEdit || !isCustom}
              onChange={(e) => setDimension('labelHeightMm', e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="rounded border border-dashed border-outline-variant bg-surface-container"
            style={{
              width: `${Math.min(96, (form.labelWidthMm / 101.6) * 96)}px`,
              height: `${Math.min(96, (form.labelHeightMm / 152.4) * 96)}px`,
            }}
          />
          <p
            className={`font-sans text-[12px] ${
              !validation.ok
                ? 'text-destructive'
                : validation.warning
                  ? 'text-tertiary'
                  : 'text-on-surface-variant'
            }`}
          >
            {!validation.ok
              ? validation.error
              : validation.warning ?? `Preview · ${form.labelWidthMm} × ${form.labelHeightMm} mm`}
          </p>
        </div>
      </div>

      <div className="h-px w-full bg-outline-variant/60" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[12px] font-medium text-on-surface-variant">
            Label prefix
          </span>
          <input
            className={inputClass}
            value={form.labelPrefix}
            disabled={!canEdit}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, labelPrefix: e.target.value } : prev))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[12px] font-medium text-on-surface-variant">
            Invoice prefix
          </span>
          <input
            className={inputClass}
            value={form.invoicePrefix}
            disabled={!canEdit}
            onChange={(e) =>
              setForm((prev) => (prev ? { ...prev, invoicePrefix: e.target.value } : prev))
            }
          />
        </label>
      </div>

      <div className="h-px w-full bg-outline-variant/60" />

      <div className="space-y-2">
        <span className="font-sans text-[12px] font-semibold tracking-wide text-on-surface-variant uppercase">
          Label content
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LABEL_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              checked={form.labelOptions[toggle.key]}
              disabled={!canEdit}
              onCheckedChange={(value) => setLabelOption(toggle.key, value)}
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-outline-variant/60" />

      <div className="space-y-2">
        <span className="font-sans text-[12px] font-semibold tracking-wide text-on-surface-variant uppercase">
          Invoice content
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INVOICE_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              checked={form.invoiceOptions[toggle.key]}
              disabled={!canEdit}
              onCheckedChange={(value) => setInvoiceOption(toggle.key, value)}
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-outline-variant/60" />

      <ToggleRow
        label="Auto-mark labels as printed on generate"
        checked={form.autoMarkPrinted}
        disabled={!canEdit}
        onCheckedChange={(value) =>
          setForm((prev) => (prev ? { ...prev, autoMarkPrinted: value } : prev))
        }
      />

      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateSettings.isPending || !validation.ok}
            className="h-10 gap-2 rounded-lg px-4 font-sans text-[13px] font-semibold"
          >
            <Save className="size-4" />
            Save settings
          </Button>
        </div>
      ) : null}
    </div>
  )
}
