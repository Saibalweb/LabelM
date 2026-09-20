import type { Invoice, InvoiceInput } from '@/lib/types'

// Invoice flow is deferred. This keeps the previous localStorage-backed
// implementation alive (no demo data) so the existing invoice pages compile
// and function until the real Supabase invoice flow is built.

const INVOICES_KEY = 'labelm.invoices'

function readInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(INVOICES_KEY)
    return raw ? (JSON.parse(raw) as Invoice[]) : []
  } catch {
    return []
  }
}

function writeInvoices(invoices: Invoice[]): void {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices))
}

export function uid(): string {
  return crypto.randomUUID()
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function nextInvoiceId(invoices: Invoice[]): string {
  const year = new Date().getFullYear()
  const max = invoices.reduce((acc, invoice) => {
    const match = invoice.invoiceId.match(/(\d+)$/)
    const num = match ? Number(match[1]) : 0
    return Math.max(acc, num)
  }, 0)
  return `INV-${year}-${String(max + 1).padStart(4, '0')}`
}

export const invoiceService = {
  async list(): Promise<Invoice[]> {
    return [...readInvoices()].sort(
      (a, b) => new Date(b.generatedOn).getTime() - new Date(a.generatedOn).getTime()
    )
  },

  async getById(id: string): Promise<Invoice | null> {
    return readInvoices().find((invoice) => invoice.id === id) ?? null
  },

  async create(input: InvoiceInput): Promise<Invoice> {
    const invoices = readInvoices()
    const invoice: Invoice = {
      ...input,
      id: uid(),
      invoiceId: nextInvoiceId(invoices),
      generatedOn: todayLabel(),
    }
    writeInvoices([invoice, ...invoices])
    return invoice
  },

  async update(id: string, patch: Partial<Invoice>): Promise<Invoice | null> {
    const invoices = readInvoices()
    const index = invoices.findIndex((invoice) => invoice.id === id)
    if (index === -1) return null
    const updated: Invoice = { ...invoices[index], ...patch }
    invoices[index] = updated
    writeInvoices(invoices)
    return updated
  },

  async remove(id: string): Promise<void> {
    writeInvoices(readInvoices().filter((invoice) => invoice.id !== id))
  },
}