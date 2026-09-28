import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChain, type MockSupabase } from '@/test/supabase-helpers'

const { supabaseMock } = vi.hoisted(() => {
  const supabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  } as unknown as MockSupabase
  return { supabaseMock: supabase }
})

vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock }))

import { settingsService } from '@/services/settings'

const profileRow = {
  company_name: 'Maira 3D Cam',
  tagline: 'Direct Castable & Non Castable',
  address: '136 Tarak Pramanick Road',
  contact_person: 'Kadir Ali',
  phones: [
    { id: 'owner', label: 'Owner', value: '9543166067', showOnLabel: true, showOnInvoice: true },
    { label: 'Office', value: '9831410835', showOnInvoice: true },
  ],
  email: 'maira3dcam78@gmail.com',
  website: null,
  gst_number: '19ABCDE1234F1Z5',
  logo_url: null,
}

const settingsRow = {
  label_preset: '100x150',
  label_width_mm: '100',
  label_height_mm: '150',
  label_prefix: 'ML',
  invoice_prefix: 'INV',
  auto_mark_printed: true,
  label_options: { showCompanyName: false, showRate: true },
  invoice_options: { showDueDate: false },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('settingsService.getCompanyProfile', () => {
  it('maps a row and normalises phone entries (ids, booleans)', async () => {
    const { query } = createChain(() => ({ data: profileRow, error: null }))
    supabaseMock.from.mockReturnValue(query)

    const profile = await settingsService.getCompanyProfile()

    expect(profile.companyName).toBe('Maira 3D Cam')
    expect(profile.gstNumber).toBe('19ABCDE1234F1Z5')
    expect(profile.phones).toEqual([
      { id: 'owner', label: 'Owner', value: '9543166067', showOnLabel: true, showOnInvoice: true },
      { id: 'phone-1', label: 'Office', value: '9831410835', showOnLabel: false, showOnInvoice: true },
    ])
  })

  it('falls back to defaults when no row exists', async () => {
    const { query } = createChain(() => ({ data: null, error: null }))
    supabaseMock.from.mockReturnValue(query)

    const profile = await settingsService.getCompanyProfile()
    expect(profile.companyName).toBe('My Company')
    expect(profile.phones).toEqual([])
  })
})

describe('settingsService.updateCompanyProfile', () => {
  it('upserts the singleton row then re-reads it', async () => {
    const upsert = createChain(() => ({ data: null, error: null }))
    const read = createChain(() => ({ data: profileRow, error: null }))
    supabaseMock.from.mockReturnValueOnce(upsert.query).mockReturnValueOnce(read.query)

    const profile = await settingsService.updateCompanyProfile({
      companyName: 'Maira 3D Cam',
      tagline: null,
      address: null,
      contactPerson: null,
      phones: [],
      email: null,
      website: null,
      gstNumber: null,
      logoUrl: null,
    })

    const upsertArgs = upsert.calls.find((c) => c.method === 'upsert')?.args[0] as Record<
      string,
      unknown
    >
    expect(upsertArgs).toMatchObject({ id: 1, company_name: 'Maira 3D Cam' })
    expect(profile.companyName).toBe('Maira 3D Cam')
  })
})

describe('settingsService.getAppSettings', () => {
  it('maps columns and merges partial option blobs over defaults', async () => {
    const { query } = createChain(() => ({ data: settingsRow, error: null }))
    supabaseMock.from.mockReturnValue(query)

    const settings = await settingsService.getAppSettings()

    expect(settings.labelPreset).toBe('100x150')
    expect(settings.labelWidthMm).toBe(100)
    expect(settings.labelHeightMm).toBe(150)
    expect(settings.labelPrefix).toBe('ML')
    expect(settings.autoMarkPrinted).toBe(true)
    // overridden keys apply, untouched keys keep defaults
    expect(settings.labelOptions.showCompanyName).toBe(false)
    expect(settings.labelOptions.showRate).toBe(true)
    expect(settings.labelOptions.showAmount).toBe(true)
    expect(settings.invoiceOptions.showDueDate).toBe(false)
    expect(settings.invoiceOptions.showGst).toBe(true)
  })

  it('falls back to defaults when no row exists', async () => {
    const { query } = createChain(() => ({ data: null, error: null }))
    supabaseMock.from.mockReturnValue(query)

    const settings = await settingsService.getAppSettings()
    expect(settings.labelPreset).toBe('60x40')
    expect(settings.labelWidthMm).toBe(60)
    expect(settings.labelHeightMm).toBe(40)
    expect(settings.invoiceOptions.showDueDate).toBe(true)
  })
})

describe('settingsService.updateAppSettings', () => {
  it('upserts the singleton row then re-reads it', async () => {
    const upsert = createChain(() => ({ data: null, error: null }))
    const read = createChain(() => ({ data: settingsRow, error: null }))
    supabaseMock.from.mockReturnValueOnce(upsert.query).mockReturnValueOnce(read.query)

    const settings = await settingsService.updateAppSettings({
      labelPreset: 'custom',
      labelWidthMm: 80,
      labelHeightMm: 120,
      labelPrefix: 'ML',
      invoicePrefix: 'INV',
      autoMarkPrinted: false,
      labelOptions: {
        showCompanyName: true,
        showCustomerName: true,
        showSlNo: true,
        showDate: true,
        showWeight: true,
        showAmount: true,
        showRate: false,
        showPhone: false,
        showAddress: false,
      },
      invoiceOptions: {
        showTagline: true,
        showAddress: true,
        showGst: true,
        showPhones: true,
        showEmail: true,
        showWebsite: false,
        showContactPerson: false,
        showDueDate: true,
      },
    })

    const upsertArgs = upsert.calls.find((c) => c.method === 'upsert')?.args[0] as Record<
      string,
      unknown
    >
    expect(upsertArgs).toMatchObject({
      id: 1,
      label_preset: 'custom',
      label_width_mm: 80,
      label_height_mm: 120,
    })
    expect(settings.labelPreset).toBe('100x150')
  })
})
