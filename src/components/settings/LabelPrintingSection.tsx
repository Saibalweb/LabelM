import { useState } from 'react'
import { Check, Minus, Pencil, Save, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppSettingsQuery, useUpdateAppSettings } from '@/hooks/queries'
import { SectionHeader } from '@/components/settings/SectionHeader'
import {
  CUSTOM_PRESET_ID,
  findPreset,
  LABEL_PRESETS,
  resolveLabelDimensions,
  validateLabelSize,
} from '@/lib/labelPresets'
import type { AppSettings, AppSettingsInput, InvoiceOptions, LabelOptions } from '@/lib/types'
import { cn } from '@/lib/utils'

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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-3.5 py-3">
      <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-body-md text-body-md font-semibold text-on-surface">{value}</p>
    </div>
  )
}

function ToggleChips({
  toggles,
  options,
}: {
  toggles: { key: string; label: string }[]
  options: Record<string, boolean>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {toggles.map((toggle) => {
        const on = options[toggle.key]
        return (
          <span
            key={toggle.key}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-sm text-label-sm',
              on
                ? 'bg-secondary-container/40 text-on-secondary-container'
                : 'bg-surface-container text-outline'
            )}
          >
            {on ? <Check className="size-3" /> : <Minus className="size-3" />}
            {toggle.label}
          </span>
        )
      })}
    </div>
  )
}

function toInput(settings: AppSettings): AppSettingsInput {
  return {
    labelPreset: settings.labelPreset,
    labelWidthMm: settings.labelWidthMm,
    labelHeightMm: settings.labelHeightMm,
    labelPrefix: settings.labelPrefix,
    invoicePrefix: settings.invoicePrefix,
    autoMarkPrinted: settings.autoMarkPrinted,
    labelOptions: settings.labelOptions,
    invoiceOptions: settings.invoiceOptions,
  }
}

export function LabelPrintingSection({ canEdit }: { canEdit: boolean }) {
  const { data } = useAppSettingsQuery()
  const updateSettings = useUpdateAppSettings()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<AppSettingsInput | null>(null)

  const openEdit = () => {
    if (!data) return
    setForm(toInput(data))
    setEditing(true)
  }

  const validation = form ? validateLabelSize(form.labelWidthMm, form.labelHeightMm) : null
  const isCustom = form?.labelPreset === CUSTOM_PRESET_ID

  const handlePreset = (presetId: string) => {
    if (presetId === CUSTOM_PRESET_ID) {
      setForm((prev) => (prev ? { ...prev, labelPreset: CUSTOM_PRESET_ID } : prev))
      return
    }
    const dims = resolveLabelDimensions(presetId, form?.labelWidthMm ?? 0, form?.labelHeightMm ?? 0)
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
    if (!form) return
    if (!validation?.ok) {
      toast.error(validation?.error ?? 'Invalid label size.')
      return
    }
    try {
      await updateSettings.mutateAsync(form)
      toast.success('Label & invoice settings saved')
      setEditing(false)
    } catch {
      toast.error('Failed to save settings.')
    }
  }

  const presetLabel =
    data && data.labelPreset !== CUSTOM_PRESET_ID
      ? (findPreset(data.labelPreset)?.label ?? `${data.labelWidthMm} × ${data.labelHeightMm} mm`)
      : `${data?.labelWidthMm ?? '—'} × ${data?.labelHeightMm ?? '—'} mm (Custom)`

  return (
    <>
      <section className="space-y-4">
        <SectionHeader
          icon={<Tag className="size-5" />}
          title="Label & Printing"
          description="Size, numbering prefixes and printed fields."
          action={
            canEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={openEdit}
                disabled={!data}
                className="h-10 shrink-0 gap-2 rounded-lg border-outline-variant font-label-md text-label-md"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryTile label="Label size" value={presetLabel} />
            <SummaryTile label="Label prefix" value={data?.labelPrefix ?? 'LBL'} />
            <SummaryTile label="Invoice prefix" value={data?.invoicePrefix ?? 'INV'} />
          </div>

          <div className="space-y-2">
            <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Label content
            </p>
            <ToggleChips
              toggles={LABEL_TOGGLES}
              options={(data?.labelOptions ?? {}) as Record<string, boolean>}
            />
          </div>

          <div className="space-y-2">
            <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Invoice content
            </p>
            <ToggleChips
              toggles={INVOICE_TOGGLES}
              options={(data?.invoiceOptions ?? {}) as Record<string, boolean>}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3.5 py-3">
            <span className="font-body-md text-body-md text-on-surface">
              Auto-mark labels as printed on generate
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold',
                data?.autoMarkPrinted
                  ? 'bg-secondary-container/40 text-on-secondary-container'
                  : 'bg-surface-container text-outline'
              )}
            >
              {data?.autoMarkPrinted ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </section>

      {canEdit ? (
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent className="gap-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-0 sm:max-w-2xl">
            <DialogHeader className="flex-row items-start gap-3 border-b border-outline-variant p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Tag className="size-5" />
              </span>
              <div>
                <DialogTitle className="font-headline-md text-headline-md text-on-surface">
                  Edit label &amp; invoice settings
                </DialogTitle>
                <DialogDescription className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Applies to every label and invoice generated from now on.
                </DialogDescription>
              </div>
            </DialogHeader>

            {form ? (
              <div className="max-h-[65vh] space-y-6 overflow-y-auto p-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="font-sans text-[12px] font-medium text-on-surface-variant">
                        Label size
                      </span>
                      <select
                        className={inputClass}
                        value={form.labelPreset}
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
                        disabled={!isCustom}
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
                        disabled={!isCustom}
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
                        !validation?.ok
                          ? 'text-destructive'
                          : validation?.warning
                            ? 'text-tertiary'
                            : 'text-on-surface-variant'
                      }`}
                    >
                      {!validation?.ok
                        ? validation?.error
                        : validation?.warning ??
                          `Preview · ${form.labelWidthMm} × ${form.labelHeightMm} mm`}
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
                      onChange={(e) =>
                        setForm((prev) => (prev ? { ...prev, labelPrefix: e.target.value } : prev))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-sans text-[12px] font-medium text-on-surface-variant">
                      Invoice prefix
                    </span>
                    <input
                      className={inputClass}
                      value={form.invoicePrefix}
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
                        disabled={false}
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
                        disabled={false}
                        onCheckedChange={(value) => setInvoiceOption(toggle.key, value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-outline-variant/60" />

                <ToggleRow
                  label="Auto-mark labels as printed on generate"
                  checked={form.autoMarkPrinted}
                  disabled={false}
                  onCheckedChange={(value) =>
                    setForm((prev) => (prev ? { ...prev, autoMarkPrinted: value } : prev))
                  }
                />
              </div>
            ) : null}

            <DialogFooter className="mx-0 mb-0 flex-col-reverse gap-2 rounded-b-2xl border-t border-outline-variant bg-surface-container-low/50 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
                className="h-11 rounded-xl px-5 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={updateSettings.isPending || !validation?.ok}
                className="h-11 gap-2 rounded-xl bg-primary px-6 font-body-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
              >
                <Save className="size-4" />
                {updateSettings.isPending ? 'Saving…' : 'Save settings'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
