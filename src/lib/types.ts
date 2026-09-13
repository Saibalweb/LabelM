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
  invoiceId?: string
  createdAt: string
}

export type LabelInput = Omit<Label, 'id' | 'createdAt' | 'totalPrice'>

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Partial'

export interface InvoiceLineItem {
  slNo: string
  date: string
  weightKg: number
  rate: number
  amount: number
}

export interface InvoicePayment {
  amount: number
  date: string
  method: string
  receivedBy: string
}

export interface Invoice {
  id: string
  customer: string
  customerId?: string
  tone: number
  invoiceId: string
  period: string
  billingPeriod: string
  dateIssued: string
  dueDate: string
  address: string
  email: string
  phone: string
  total: number
  subtotal: number
  taxRate: number
  tax: number
  paid: number
  due: number
  status: InvoiceStatus
  generatedOn: string
  lineItems: InvoiceLineItem[]
  payments: InvoicePayment[]
}

export type InvoiceInput = Omit<Invoice, 'id' | 'invoiceId' | 'generatedOn'>