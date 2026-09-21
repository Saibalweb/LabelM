export type Role = 'owner' | 'admin' | 'staff'
export type MemberStatus = 'invited' | 'active' | 'suspended'

export interface Employee {
  id: string
  email: string
  full_name: string
  role: Role
  status: MemberStatus
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export type LabelStatus = 'draft' | 'printed'

export type LabelSortKey =
  | 'newest'
  | 'oldest'
  | 'amount-desc'
  | 'amount-asc'
  | 'weight-desc'
  | 'customer-asc'

export type BillingFilter = 'billed' | 'unbilled'

export interface LabelFilters {
  query?: string
  customerIds?: number[]
  statuses?: LabelStatus[]
  billing?: BillingFilter[]
  minWeight?: number | null
  maxWeight?: number | null
  minAmount?: number | null
  maxAmount?: number | null
  from?: string
  to?: string
}

export interface LabelListParams {
  page: number
  pageSize: number
  sortBy: LabelSortKey
}

export interface LabelListResult {
  data: Label[]
  total: number
}

export interface LabelStats {
  totalLabels: number
  totalWeight: number
  minWeight: number
  maxWeight: number
  minAmount: number
  maxAmount: number
  printQueue: number
}

export interface CustomerLabelCount {
  customerId: number
  count: number
}

export interface Customer {
  id: number
  name: string
  address: string | null
  phone: string | null
  email: string | null
  gst_number: string | null
  currentRate: number | null
  created_at: string
  updated_at: string
}

export type CustomerInput = Omit<
  Customer,
  'id' | 'currentRate' | 'created_at' | 'updated_at'
> & {
  rate?: number | null
}

export interface CustomerPrice {
  id: number
  customerId: number
  rate: number
  effectiveFrom: string
  effectiveTo: string | null
}

export interface Label {
  id: number
  slNo: string
  customerId: number
  customerName: string | null
  date: string
  weight: number
  rate: number
  amount: number
  status: LabelStatus
  invoiceId: number | null
  createdAt: string
}

export type LabelInput = {
  customerId: number
  date: string
  weight: number
  rate: number
}

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
  customerId?: string | number
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