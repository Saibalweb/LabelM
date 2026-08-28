import type { Customer } from '@/lib/types'
import type { CustomerRepository } from '@/lib/repositories/types'
import { loadCustomers, saveCustomers, uid } from '@/lib/repositories/storage'

const LATENCY = 250

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY))
}

class LocalStorageCustomerRepository implements CustomerRepository {
  async list(): Promise<Customer[]> {
    await delay()
    return [...loadCustomers()].sort((a, b) => a.name.localeCompare(b.name))
  }

  async getById(id: string): Promise<Customer | null> {
    await delay()
    return loadCustomers().find((customer) => customer.id === id) ?? null
  }

  async create(input: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    await delay()
    const customers = loadCustomers()
    const customer: Customer = {
      ...input,
      id: uid(),
      createdAt: new Date().toISOString(),
    }
    saveCustomers([...customers, customer])
    return customer
  }

  async update(id: string, patch: Partial<Customer>): Promise<Customer | null> {
    await delay()
    const customers = loadCustomers()
    const index = customers.findIndex((customer) => customer.id === id)
    if (index === -1) return null
    const updated: Customer = { ...customers[index], ...patch }
    customers[index] = updated
    saveCustomers(customers)
    return updated
  }

  async remove(id: string): Promise<void> {
    await delay()
    saveCustomers(loadCustomers().filter((customer) => customer.id !== id))
  }
}

export const customerRepository: CustomerRepository =
  new LocalStorageCustomerRepository()