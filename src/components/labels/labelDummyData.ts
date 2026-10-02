import type { CompanyProfile, Label } from '@/lib/types'

/** Dummy record used only for the settings preview — never persisted. */
export const DUMMY_LABEL: Label = {
  id: 0,
  slNo: 'LBL2026-0865',
  customerId: 0,
  customerName: 'UMA ENTERPRISE',
  date: '2026-09-28',
  weight: 5,
  rate: 560,
  amount: 2800,
  status: 'draft',
  invoiceId: null,
  createdAt: '2026-09-28T10:00:00Z',
}

export const DUMMY_COMPANY: CompanyProfile = {
  companyName: 'Your Company',
  tagline: null,
  address: 'Company address line',
  contactPerson: null,
  phones: [
    { id: 'main', label: 'Office', value: '+91 90000 00000', showOnLabel: true, showOnInvoice: true },
  ],
  email: null,
  website: null,
  gstNumber: null,
  logoUrl: null,
}