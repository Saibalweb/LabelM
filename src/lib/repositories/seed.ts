import type { Customer, Label } from '@/lib/types'
import { loadCustomers, loadLabels, saveCustomers, saveLabels } from '@/lib/repositories/storage'

const now = Date.now()
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString()

const seedCustomers: Customer[] = [
  { id: 'c1', name: 'Acme Corp Logistics', company: 'ACME-01', email: 'billing@acmecorp.com', category: 'B2B', status: 'active', phone: '+91 98110 22334', address: 'Mumbai, MH', createdAt: daysAgo(40) },
  { id: 'c2', name: 'Global Retail Inc.', company: 'GRI-88', email: 'procurement@globalretail.net', category: 'Retail', status: 'active', phone: '+91 98220 55667', address: 'Delhi, DL', createdAt: daysAgo(35) },
  { id: 'c3', name: 'Summit Manufacturing', company: 'SUM-42', email: 'orders@summitmfg.co', category: 'Wholesale', status: 'inactive', phone: '+91 98765 11223', address: 'Ahmedabad, GJ', createdAt: daysAgo(28) },
  { id: 'c4', name: 'TechNova Solutions', company: 'TNS-09', email: 'admin@technova.io', category: 'B2B', status: 'active', phone: '+91 99887 33445', address: 'Kolkata, WB', createdAt: daysAgo(20) },
  { id: 'c5', name: 'Reddy Distributors', company: 'RED-77', email: 'sales@reddy.co', category: 'Wholesale', status: 'active', phone: '+91 91234 88776', address: 'Hyderabad, TG', createdAt: daysAgo(12) },
]

const seedLabels: Label[] = [
  {
    id: 'l1',
    slNo: 'SL-9021',
    customerId: 'c1',
    customerName: 'Sharma Traders',
    date: '2023-10-24',
    productId: 'PRD-8924-XL',
    batch: 'Batch A',
    expDate: '12/2025',
    description: 'Premium Industrial Widget - Extra Large Variant with reinforced casing.',
    totalWeightKg: 62,
    mrpPerKg: 20,
    totalPrice: 1302,
    status: 'printed',
    createdAt: daysAgo(4),
  },
  {
    id: 'l2',
    slNo: 'SL-9020',
    customerId: 'c3',
    customerName: 'Patel Enterprises',
    date: '2023-10-23',
    productId: 'PRD-8811-M',
    batch: 'Batch B',
    expDate: '08/2025',
    description: 'Standard Medium Widget with zinc plated fittings.',
    totalWeightKg: 50,
    mrpPerKg: 17,
    totalPrice: 892.5,
    status: 'printed',
    createdAt: daysAgo(5),
  },
  {
    id: 'l3',
    slNo: 'SL-9019',
    customerId: 'c2',
    customerName: 'Mehta & Sons',
    date: '2023-10-22',
    productId: 'PRD-9002-S',
    batch: 'Batch A',
    expDate: '06/2026',
    description: 'Compact Standard Widget for general utility use.',
    totalWeightKg: 155,
    mrpPerKg: 20,
    totalPrice: 3255,
    status: 'printed',
    createdAt: daysAgo(6),
  },
  {
    id: 'l4',
    slNo: 'SL-9018',
    customerId: 'c4',
    customerName: 'Gupta Agencies',
    date: '2023-10-20',
    productId: 'PRD-8755-C',
    batch: 'Special Order',
    expDate: '03/2025',
    description: 'Custom order widgets, copper variant.',
    totalWeightKg: 21,
    mrpPerKg: 20.01,
    totalPrice: 441.22,
    status: 'draft',
    createdAt: daysAgo(8),
  },
]

export function seedIfEmpty(): void {
  if (loadLabels().length === 0) saveLabels(seedLabels)
  if (loadCustomers().length === 0) saveCustomers(seedCustomers)
}