import { useState } from 'react'
import { Building2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCompanyProfileQuery, useUpdateCompanyProfile } from '@/hooks/queries'
import { SectionHeader } from '@/components/settings/SectionHeader'
import type { CompanyPhone, CompanyProfile, CompanyProfileInput } from '@/lib/types'
import { cn } from '@/lib/utils'

function newPhoneId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `phone-${Math.random().toString(36).slice(2, 10)}`
}

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 font-sans text-[13px] text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-sans text-[12px] font-medium text-on-surface-variant">{label}</span>
      {children}
    </label>
  )
}

function Detail({
  label,
  value,
  className,
  multiline = false,
}: {
  label: string
  value: string | null | undefined
  className?: string
  multiline?: boolean
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 font-body-md text-body-md text-on-surface',
          multiline ? 'break-words whitespace-pre-line' : 'truncate'
        )}
      >
        {value && value.trim() ? value : <span className="text-outline">Not set</span>}
      </p>
    </div>
  )
}

function emptyProfile(): CompanyProfileInput {
  return {
    companyName: '',
    tagline: null,
    address: null,
    contactPerson: null,
    phones: [],
    email: null,
    website: null,
    gstNumber: null,
    logoUrl: null,
  }
}

function toInput(profile: CompanyProfile): CompanyProfileInput {
  return {
    companyName: profile.companyName,
    tagline: profile.tagline,
    address: profile.address,
    contactPerson: profile.contactPerson,
    phones: profile.phones,
    email: profile.email,
    website: profile.website,
    gstNumber: profile.gstNumber,
    logoUrl: profile.logoUrl,
  }
}

function PhoneBadges({ phone }: { phone: CompanyPhone }) {
  return (
    <span className="flex items-center gap-1">
      {phone.showOnLabel ? (
        <span className="rounded bg-accent px-1.5 py-0.5 font-label-sm text-[10px] font-semibold text-on-primary-fixed">
          Label
        </span>
      ) : null}
      {phone.showOnInvoice ? (
        <span className="rounded bg-secondary-container/50 px-1.5 py-0.5 font-label-sm text-[10px] font-semibold text-on-secondary-container">
          Invoice
        </span>
      ) : null}
    </span>
  )
}

export function CompanyDetailsSection({ canEdit }: { canEdit: boolean }) {
  const { data } = useCompanyProfileQuery()
  const updateProfile = useUpdateCompanyProfile()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<CompanyProfileInput>(emptyProfile)

  const openEdit = () => {
    if (!data) return
    setForm(toInput(data))
    setEditing(true)
  }

  const set = <K extends keyof CompanyProfileInput>(key: K, value: CompanyProfileInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const updatePhone = (id: string, patch: Partial<CompanyPhone>) =>
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.map((phone) => (phone.id === id ? { ...phone, ...patch } : phone)),
    }))

  const setLabelPhone = (id: string) =>
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.map((phone) => ({ ...phone, showOnLabel: phone.id === id })),
    }))

  const addPhone = () =>
    setForm((prev) => ({
      ...prev,
      phones: [
        ...prev.phones,
        { id: newPhoneId(), label: '', value: '', showOnLabel: false, showOnInvoice: true },
      ],
    }))

  const removePhone = (id: string) =>
    setForm((prev) => ({ ...prev, phones: prev.phones.filter((phone) => phone.id !== id) }))

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required.')
      return
    }
    try {
      await updateProfile.mutateAsync({
        ...form,
        companyName: form.companyName.trim(),
        phones: form.phones.filter((phone) => phone.value.trim() !== ''),
      })
      toast.success('Company details saved')
      setEditing(false)
    } catch {
      toast.error('Failed to save company details.')
    }
  }

  const phones = data?.phones ?? []

  return (
    <>
      <section className="space-y-4">
        <SectionHeader
          icon={<Building2 className="size-5" />}
          title="Company Details"
          description="Shown on printed labels and invoices."
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

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-headline-md text-headline-md font-semibold text-on-surface">
              {data?.companyName ?? 'My Company'}
            </p>
            {data?.tagline ? (
              <p className="font-body-md text-body-md text-on-surface-variant">{data.tagline}</p>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-outline-variant/60 pt-5 sm:grid-cols-2">
            <Detail label="Contact person" value={data?.contactPerson} />
            <Detail label="GSTIN" value={data?.gstNumber} />
            <Detail label="Email" value={data?.email} />
            <Detail label="Website" value={data?.website} />
            <Detail label="Address" value={data?.address} className="sm:col-span-2" multiline />
          </div>

          <div className="mt-5 border-t border-outline-variant/60 pt-5">
            <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Phone numbers
            </p>
            {phones.length === 0 ? (
              <p className="mt-1.5 font-body-md text-body-md text-outline">No phone numbers added.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {phones.map((phone) => (
                  <li
                    key={phone.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-body-md text-body-md font-medium text-on-surface">
                        {phone.value}
                      </span>
                      {phone.label ? (
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          · {phone.label}
                        </span>
                      ) : null}
                    </div>
                    <PhoneBadges phone={phone} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {canEdit ? (
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent className="gap-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-0 sm:max-w-2xl">
            <DialogHeader className="flex-row items-start gap-3 border-b border-outline-variant p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Building2 className="size-5" />
              </span>
              <div>
                <DialogTitle className="font-headline-md text-headline-md text-on-surface">
                  Edit company details
                </DialogTitle>
                <DialogDescription className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Shown on printed labels and invoices.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Company name">
                  <input
                    className={inputClass}
                    value={form.companyName}
                    onChange={(e) => set('companyName', e.target.value)}
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    className={inputClass}
                    value={form.tagline ?? ''}
                    onChange={(e) => set('tagline', e.target.value || null)}
                  />
                </Field>
                <Field label="Contact person">
                  <input
                    className={inputClass}
                    value={form.contactPerson ?? ''}
                    onChange={(e) => set('contactPerson', e.target.value || null)}
                  />
                </Field>
                <Field label="GSTIN">
                  <input
                    className={inputClass}
                    value={form.gstNumber ?? ''}
                    onChange={(e) => set('gstNumber', e.target.value || null)}
                  />
                </Field>
                <Field label="Email">
                  <input
                    className={inputClass}
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => set('email', e.target.value || null)}
                  />
                </Field>
                <Field label="Website">
                  <input
                    className={inputClass}
                    value={form.website ?? ''}
                    onChange={(e) => set('website', e.target.value || null)}
                  />
                </Field>
              </div>
              <Field label="Address">
                <textarea
                  className={`${inputClass} h-20 resize-y py-2`}
                  value={form.address ?? ''}
                  onChange={(e) => set('address', e.target.value || null)}
                />
              </Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[12px] font-semibold tracking-wide text-on-surface-variant uppercase">
                    Phone numbers
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addPhone}
                    className="h-8 gap-1.5 rounded-lg px-2 font-sans text-[12px] text-primary"
                  >
                    <Plus className="size-3.5" />
                    Add number
                  </Button>
                </div>
                {form.phones.length === 0 ? (
                  <p className="font-sans text-[12px] text-on-surface-variant">
                    No phone numbers added.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.phones.map((phone) => (
                      <div
                        key={phone.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant/60 p-2"
                      >
                        <input
                          className={`${inputClass} h-9 w-28`}
                          placeholder="Label"
                          value={phone.label}
                          onChange={(e) => updatePhone(phone.id, { label: e.target.value })}
                        />
                        <input
                          className={`${inputClass} h-9 flex-1 min-w-40`}
                          placeholder="Number"
                          value={phone.value}
                          onChange={(e) => updatePhone(phone.id, { value: e.target.value })}
                        />
                        <label className="flex items-center gap-1.5 font-sans text-[12px] text-on-surface-variant">
                          <input
                            type="radio"
                            name="label-phone"
                            className="accent-primary"
                            checked={phone.showOnLabel}
                            onChange={() => setLabelPhone(phone.id)}
                          />
                          Label
                        </label>
                        <label className="flex items-center gap-1.5 font-sans text-[12px] text-on-surface-variant">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={phone.showOnInvoice}
                            onChange={(e) =>
                              updatePhone(phone.id, { showOnInvoice: e.target.checked })
                            }
                          />
                          Invoice
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove phone number"
                          onClick={() => removePhone(phone.id)}
                          className="size-8 rounded-lg text-on-surface-variant hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                disabled={updateProfile.isPending}
                className="h-11 gap-2 rounded-xl bg-primary px-6 font-body-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
              >
                <Save className="size-4" />
                {updateProfile.isPending ? 'Saving…' : 'Save details'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
