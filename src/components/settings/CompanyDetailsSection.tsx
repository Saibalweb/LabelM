import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCompanyProfileQuery, useUpdateCompanyProfile } from '@/hooks/queries'
import type { CompanyPhone, CompanyProfileInput } from '@/lib/types'

function newPhoneId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `phone-${Math.random().toString(36).slice(2, 10)}`
}

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 font-sans text-[13px] text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-sans text-[12px] font-medium text-on-surface-variant">{label}</span>
      {children}
    </label>
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

export function CompanyDetailsSection({ canEdit }: { canEdit: boolean }) {
  const { data } = useCompanyProfileQuery()
  const updateProfile = useUpdateCompanyProfile()
  const [form, setForm] = useState<CompanyProfileInput>(emptyProfile)

  useEffect(() => {
    if (!data) return
    setForm({
      companyName: data.companyName,
      tagline: data.tagline,
      address: data.address,
      contactPerson: data.contactPerson,
      phones: data.phones,
      email: data.email,
      website: data.website,
      gstNumber: data.gstNumber,
      logoUrl: data.logoUrl,
    })
  }, [data])

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
    } catch {
      toast.error('Failed to save company details.')
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <input
            className={inputClass}
            value={form.companyName}
            disabled={!canEdit}
            onChange={(e) => set('companyName', e.target.value)}
          />
        </Field>
        <Field label="Tagline">
          <input
            className={inputClass}
            value={form.tagline ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('tagline', e.target.value || null)}
          />
        </Field>
        <Field label="Contact person">
          <input
            className={inputClass}
            value={form.contactPerson ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('contactPerson', e.target.value || null)}
          />
        </Field>
        <Field label="GSTIN">
          <input
            className={inputClass}
            value={form.gstNumber ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('gstNumber', e.target.value || null)}
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={form.email ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('email', e.target.value || null)}
          />
        </Field>
        <Field label="Website">
          <input
            className={inputClass}
            value={form.website ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('website', e.target.value || null)}
          />
        </Field>
      </div>
      <Field label="Address">
        <textarea
          className={`${inputClass} h-20 resize-y py-2`}
          value={form.address ?? ''}
          disabled={!canEdit}
          onChange={(e) => set('address', e.target.value || null)}
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] font-semibold tracking-wide text-on-surface-variant uppercase">
            Phone numbers
          </span>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              onClick={addPhone}
              className="h-8 gap-1.5 rounded-lg px-2 font-sans text-[12px] text-primary"
            >
              <Plus className="size-3.5" />
              Add number
            </Button>
          ) : null}
        </div>
        {form.phones.length === 0 ? (
          <p className="font-sans text-[12px] text-on-surface-variant">No phone numbers added.</p>
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
                  disabled={!canEdit}
                  onChange={(e) => updatePhone(phone.id, { label: e.target.value })}
                />
                <input
                  className={`${inputClass} h-9 flex-1 min-w-40`}
                  placeholder="Number"
                  value={phone.value}
                  disabled={!canEdit}
                  onChange={(e) => updatePhone(phone.id, { value: e.target.value })}
                />
                <label className="flex items-center gap-1.5 font-sans text-[12px] text-on-surface-variant">
                  <input
                    type="radio"
                    name="label-phone"
                    className="accent-primary"
                    checked={phone.showOnLabel}
                    disabled={!canEdit}
                    onChange={() => setLabelPhone(phone.id)}
                  />
                  Label
                </label>
                <label className="flex items-center gap-1.5 font-sans text-[12px] text-on-surface-variant">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={phone.showOnInvoice}
                    disabled={!canEdit}
                    onChange={(e) => updatePhone(phone.id, { showOnInvoice: e.target.checked })}
                  />
                  Invoice
                </label>
                {canEdit ? (
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
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="h-10 gap-2 rounded-lg px-4 font-sans text-[13px] font-semibold"
          >
            <Save className="size-4" />
            Save details
          </Button>
        </div>
      ) : null}
    </div>
  )
}
