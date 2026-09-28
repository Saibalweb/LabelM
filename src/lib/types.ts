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

export interface CustomerFilters {
  query?: string
}

export interface CustomerListParams {
  page: number
  pageSize: number
}

export interface CustomerListResult {
  data: Customer[]
  total: number
}

export interface DeletedCustomer {
  id: number
  name: string
  address: string | null
  phone: string | null
  email: string | null
  gst_number: string | null
  deleted_at: string
  deleted_by: string | null
  deleted_by_name: string | null
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

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque'

export interface InvoiceLineItem {
  id: number
  slNo: string
  date: string
  weightKg: number
  rate: number
  amount: number
}

export interface InvoicePayment {
  id: number
  amount: number
  date: string
  mode: PaymentMode
  notes: string | null
  receivedBy: string | null
}

export interface CompanyPhone {
  id: string
  label: string
  value: string
  showOnLabel: boolean
  showOnInvoice: boolean
}

export interface CompanyProfile {
  companyName: string
  tagline: string | null
  address: string | null
  contactPerson: string | null
  phones: CompanyPhone[]
  email: string | null
  website: string | null
  gstNumber: string | null
  logoUrl: string | null
}

export interface CompanyProfileInput {
  companyName: string
  tagline: string | null
  address: string | null
  contactPerson: string | null
  phones: CompanyPhone[]
  email: string | null
  website: string | null
  gstNumber: string | null
  logoUrl: string | null
}

export interface LabelOptions {
  showCompanyName: boolean
  showCustomerName: boolean
  showSlNo: boolean
  showDate: boolean
  showWeight: boolean
  showAmount: boolean
  showRate: boolean
  showPhone: boolean
  showAddress: boolean
}

export interface InvoiceOptions {
  showTagline: boolean
  showAddress: boolean
  showGst: boolean
  showPhones: boolean
  showEmail: boolean
  showWebsite: boolean
  showContactPerson: boolean
  showDueDate: boolean
}

export interface AppSettings {
  labelPreset: string
  labelWidthMm: number
  labelHeightMm: number
  labelPrefix: string
  invoicePrefix: string
  autoMarkPrinted: boolean
  labelOptions: LabelOptions
  invoiceOptions: InvoiceOptions
}

export interface AppSettingsInput {
  labelPreset: string
  labelWidthMm: number
  labelHeightMm: number
  labelPrefix: string
  invoicePrefix: string
  autoMarkPrinted: boolean
  labelOptions: LabelOptions
  invoiceOptions: InvoiceOptions
}

export interface CompanySnapshot {
  name: string | null
  tagline: string | null
  address: string | null
  contactPerson: string | null
  phones: CompanyPhone[]
  email: string | null
  website: string | null
  gstNumber: string | null
  logoUrl: string | null
}

export interface CustomerSnapshot {
  name: string | null
  address: string | null
  email: string | null
  phone: string | null
  gstNumber: string | null
}

export interface Invoice {
  id: number
  invoiceNumber: string
  customerId: number
  customerName: string
  customerAddress: string | null
  customerEmail: string | null
  customerPhone: string | null
  periodStart: string
  periodEnd: string
  billingPeriod: string
  period: string
  totalAmount: number
  totalWeight: number
  status: InvoiceStatus
  dueDate: string | null
  createdAt: string
  paid: number
  due: number
  companySnapshot: CompanySnapshot | null
  customerSnapshot: CustomerSnapshot | null
  lineItems: InvoiceLineItem[]
  payments: InvoicePayment[]
}

export interface InvoicePreviewRow {
  customerId: number
  customerName: string
  labelCount: number
  totalWeight: number
  totalAmount: number
  hasOverlap: boolean
}

export interface InvoiceGenerationResult {
  customerId: number
  customerName: string
  invoiceId: number | null
  invoiceNumber: string | null
  labelCount: number
  totalAmount: number
  totalWeight: number
  skipped: 'overlap' | 'no_labels' | null
}

export type InvoiceSortKey = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'

export interface InvoiceFilters {
  query?: string
  statuses?: InvoiceStatus[]
  customerIds?: number[]
  from?: string
  to?: string
  minAmount?: number | null
  maxAmount?: number | null
  overdue?: boolean
}

export type DuePreset = 'all' | 'overdue' | 'due-soon' | 'due-later'
export type DueAgingBucket = 'overdue-1-30' | 'overdue-31-60' | 'overdue-60plus'
export type DueWindow = 'all' | 'overdue' | 'month' | 'custom'

export interface DueFilters {
  query?: string
  statuses?: InvoiceStatus[]
  customerIds?: number[]
  from?: string
  to?: string
}

export interface InvoiceListParams {
  page: number
  pageSize: number
  sortBy: InvoiceSortKey
}

export interface InvoiceListResult {
  data: Invoice[]
  total: number
}

export interface InvoicePaymentInput {
  amount: number
  date: string
  mode: PaymentMode
  notes?: string | null
}