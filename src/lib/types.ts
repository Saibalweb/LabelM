export type CustomerCategory = 'B2B' | 'Retail' | 'Wholesale'
export type CustomerStatus = 'active' | 'inactive'

export interface Customer {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  category?: CustomerCategory
  status?: CustomerStatus
  createdAt: string
}

export interface Label {
  id: string
  slNo: string
  customerId: string | null
  customerName?: string
  date: string
  productId?: string
  batch?: string
  expDate?: string
  description: string
  totalWeightKg: number
  mrpPerKg: number
  totalPrice: number
  status: 'draft' | 'printed'
  createdAt: string
}

export type LabelInput = Omit<Label, 'id' | 'createdAt' | 'totalPrice'>