import type { CompanyProfile, CompanySnapshot, Invoice } from '@/lib/types'

export interface InvoiceCustomer {
  name: string
  address: string | null
  email: string | null
  phone: string | null
}

const EMPTY_COMPANY: CompanyProfile = {
  companyName: 'My Company',
  tagline: null,
  address: null,
  contactPerson: null,
  phones: [],
  email: null,
  website: null,
  gstNumber: null,
  logoUrl: null,
}

/**
 * Prefers the invoice's company snapshot (frozen at generation time) and falls
 * back to the live company profile, then to empty defaults.
 */
export function resolveCompanyHeader(
  snapshot: CompanySnapshot | null,
  profile: CompanyProfile | null
): CompanyProfile {
  if (snapshot) {
    return {
      companyName: snapshot.name ?? '',
      tagline: snapshot.tagline,
      address: snapshot.address,
      contactPerson: snapshot.contactPerson,
      phones: snapshot.phones ?? [],
      email: snapshot.email,
      website: snapshot.website,
      gstNumber: snapshot.gstNumber,
      logoUrl: snapshot.logoUrl,
    }
  }
  return profile ?? EMPTY_COMPANY
}

/** Prefers the frozen customer snapshot, falling back to the joined customer row. */
export function resolveInvoiceCustomer(invoice: Invoice): InvoiceCustomer {
  const snapshot = invoice.customerSnapshot
  return {
    name: snapshot?.name ?? invoice.customerName ?? '',
    address: snapshot?.address ?? invoice.customerAddress ?? null,
    email: snapshot?.email ?? invoice.customerEmail ?? null,
    phone: snapshot?.phone ?? invoice.customerPhone ?? null,
  }
}
