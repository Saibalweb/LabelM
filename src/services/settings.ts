import { supabase } from '@/lib/supabase'
import { resolveInvoiceOptions, resolveLabelOptions } from '@/lib/documentOptions'
import {
  DEFAULT_LABEL_HEIGHT_MM,
  DEFAULT_LABEL_WIDTH_MM,
} from '@/lib/labelPresets'
import type {
  AppSettings,
  AppSettingsInput,
  CompanyPhone,
  CompanyProfile,
  CompanyProfileInput,
} from '@/lib/types'

interface CompanyProfileRow {
  company_name: string
  tagline: string | null
  address: string | null
  contact_person: string | null
  phones: unknown
  email: string | null
  website: string | null
  gst_number: string | null
  logo_url: string | null
}

interface AppSettingsRow {
  label_preset: string
  label_width_mm: number | string
  label_height_mm: number | string
  label_prefix: string
  invoice_prefix: string
  auto_mark_printed: boolean
  label_options: unknown
  invoice_options: unknown
}

const PROFILE_COLUMNS =
  'company_name, tagline, address, contact_person, phones, email, website, gst_number, logo_url'
const SETTINGS_COLUMNS =
  'label_preset, label_width_mm, label_height_mm, label_prefix, invoice_prefix, auto_mark_printed, label_options, invoice_options'

function normalizePhones(raw: unknown): CompanyPhone[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry, index) => ({
      id: typeof entry.id === 'string' && entry.id ? entry.id : `phone-${index}`,
      label: typeof entry.label === 'string' ? entry.label : '',
      value: typeof entry.value === 'string' ? entry.value : '',
      showOnLabel: entry.showOnLabel === true,
      showOnInvoice: entry.showOnInvoice === true,
    }))
}

function toCompanyProfile(row: CompanyProfileRow | null): CompanyProfile {
  return {
    companyName: row?.company_name ?? 'My Company',
    tagline: row?.tagline ?? null,
    address: row?.address ?? null,
    contactPerson: row?.contact_person ?? null,
    phones: normalizePhones(row?.phones),
    email: row?.email ?? null,
    website: row?.website ?? null,
    gstNumber: row?.gst_number ?? null,
    logoUrl: row?.logo_url ?? null,
  }
}

function toAppSettings(row: AppSettingsRow | null): AppSettings {
  return {
    labelPreset: row?.label_preset ?? '60x40',
    labelWidthMm: Number(row?.label_width_mm ?? DEFAULT_LABEL_WIDTH_MM),
    labelHeightMm: Number(row?.label_height_mm ?? DEFAULT_LABEL_HEIGHT_MM),
    labelPrefix: row?.label_prefix ?? 'LBL',
    invoicePrefix: row?.invoice_prefix ?? 'INV',
    autoMarkPrinted: row?.auto_mark_printed ?? false,
    labelOptions: resolveLabelOptions(row?.label_options),
    invoiceOptions: resolveInvoiceOptions(row?.invoice_options),
  }
}

export const settingsService = {
  async getCompanyProfile(): Promise<CompanyProfile> {
    const { data, error } = await supabase
      .from('company_profile')
      .select(PROFILE_COLUMNS)
      .eq('id', 1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return toCompanyProfile(data as CompanyProfileRow | null)
  },

  async updateCompanyProfile(input: CompanyProfileInput): Promise<CompanyProfile> {
    const { error } = await supabase.from('company_profile').upsert({
      id: 1,
      company_name: input.companyName,
      tagline: input.tagline,
      address: input.address,
      contact_person: input.contactPerson,
      phones: input.phones,
      email: input.email,
      website: input.website,
      gst_number: input.gstNumber,
      logo_url: input.logoUrl,
    })
    if (error) throw new Error(error.message)
    return this.getCompanyProfile()
  },

  async getAppSettings(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select(SETTINGS_COLUMNS)
      .eq('id', 1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return toAppSettings(data as AppSettingsRow | null)
  },

  async updateAppSettings(input: AppSettingsInput): Promise<AppSettings> {
    const { error } = await supabase.from('app_settings').upsert({
      id: 1,
      label_preset: input.labelPreset,
      label_width_mm: input.labelWidthMm,
      label_height_mm: input.labelHeightMm,
      label_prefix: input.labelPrefix,
      invoice_prefix: input.invoicePrefix,
      auto_mark_printed: input.autoMarkPrinted,
      label_options: input.labelOptions,
      invoice_options: input.invoiceOptions,
    })
    if (error) throw new Error(error.message)
    return this.getAppSettings()
  },
}
