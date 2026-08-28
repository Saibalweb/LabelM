import type { Customer, Label } from '@/lib/types'

const LABELS_KEY = 'labelm.labels'
const CUSTOMERS_KEY = 'labelm.customers'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadLabels(): Label[] {
  return read<Label[]>(LABELS_KEY, [])
}

export function saveLabels(labels: Label[]): void {
  write(LABELS_KEY, labels)
}

export function loadCustomers(): Customer[] {
  return read<Customer[]>(CUSTOMERS_KEY, [])
}

export function saveCustomers(customers: Customer[]): void {
  write(CUSTOMERS_KEY, customers)
}

export function nextSlNo(labels: Label[]): string {
  const max = labels.reduce((acc, label) => {
    const match = label.slNo.match(/(\d+)$/)
    const num = match ? Number(match[1]) : 0
    return Math.max(acc, num)
  }, 0)
  return `SL-${String(max + 1).padStart(4, '0')}`
}

export function uid(): string {
  return crypto.randomUUID()
}