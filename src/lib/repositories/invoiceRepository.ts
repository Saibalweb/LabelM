import type { Invoice, InvoiceInput } from '@/lib/types'
import type { InvoiceRepository } from '@/lib/repositories/types'
import {
  loadInvoices,
  nextInvoiceId,
  saveInvoices,
  uid,
} from '@/lib/repositories/storage'
import { demoInvoices } from '@/lib/demo/invoices'

const LATENCY = 250

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY))
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function readInvoices(): Invoice[] {
  const stored = loadInvoices()
  if (stored.length === 0) {
    saveInvoices(demoInvoices)
    return demoInvoices
  }
  return stored
}

class LocalStorageInvoiceRepository implements InvoiceRepository {
  async list(): Promise<Invoice[]> {
    await delay()
    return [...readInvoices()].sort(
      (a, b) => new Date(b.generatedOn).getTime() - new Date(a.generatedOn).getTime()
    )
  }

  async getById(id: string): Promise<Invoice | null> {
    await delay()
    return readInvoices().find((invoice) => invoice.id === id) ?? null
  }

  async create(input: InvoiceInput): Promise<Invoice> {
    await delay()
    const invoices = readInvoices()
    const invoice: Invoice = {
      ...input,
      id: uid(),
      invoiceId: nextInvoiceId(invoices),
      generatedOn: todayLabel(),
    }
    saveInvoices([invoice, ...invoices])
    return invoice
  }

  async update(id: string, patch: Partial<Invoice>): Promise<Invoice | null> {
    await delay()
    const invoices = readInvoices()
    const index = invoices.findIndex((invoice) => invoice.id === id)
    if (index === -1) return null
    const updated: Invoice = { ...invoices[index], ...patch }
    invoices[index] = updated
    saveInvoices(invoices)
    return updated
  }

  async remove(id: string): Promise<void> {
    await delay()
    saveInvoices(readInvoices().filter((invoice) => invoice.id !== id))
  }
}

export const invoiceRepository: InvoiceRepository =
  new LocalStorageInvoiceRepository()