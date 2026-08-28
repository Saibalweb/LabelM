import type { Customer, Label, LabelInput } from '@/lib/types'

export interface LabelRepository {
  list(): Promise<Label[]>
  getById(id: string): Promise<Label | null>
  create(input: LabelInput): Promise<Label>
  update(id: string, patch: Partial<Label>): Promise<Label | null>
  remove(id: string): Promise<void>
}

export interface CustomerRepository {
  list(): Promise<Customer[]>
  getById(id: string): Promise<Customer | null>
  create(input: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer>
  update(id: string, patch: Partial<Customer>): Promise<Customer | null>
  remove(id: string): Promise<void>
}