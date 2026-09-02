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

const kgRate = 12.0

export const demoInvoices: Invoice[] = [
  {
    id: 'inv-1',
    customer: 'Acme Corp',
    tone: 0,
    invoiceId: 'INV-2026-0042',
    period: 'Oct 1 - Oct 31, 2026',
    billingPeriod: 'Sep 2026',
    dateIssued: 'Oct 15, 2026',
    dueDate: 'Nov 14, 2026',
    address: '123 Industrial Way\nNorth Port, NY 11024',
    email: 'contact@acmelogistics.com',
    phone: '+1 (555) 019-2834',
    subtotal: 12450,
    taxRate: 0,
    tax: 0,
    total: 12450,
    paid: 12450,
    due: 0,
    status: 'Paid',
    generatedOn: 'Nov 01, 2026',
    lineItems: [
      { slNo: '01', date: 'Oct 02, 2026', weightKg: 420, rate: kgRate, amount: 5040 },
      { slNo: '02', date: 'Oct 05, 2026', weightKg: 310, rate: kgRate, amount: 3720 },
      { slNo: '03', date: 'Oct 09, 2026', weightKg: 260, rate: kgRate, amount: 3120 },
      { slNo: '04', date: 'Oct 12, 2026', weightKg: 47.5, rate: kgRate, amount: 570 },
    ],
    payments: [
      { amount: 12450, date: 'Nov 01, 2026', method: 'Bank Transfer', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-2',
    customer: 'Global Logistics',
    tone: 1,
    invoiceId: 'INV-2026-0043',
    period: 'Oct 1 - Oct 31, 2026',
    billingPeriod: 'Oct 2026',
    dateIssued: 'Oct 15, 2026',
    dueDate: 'Nov 14, 2026',
    address: '88 Freight Avenue\nSavannah, GA 31401',
    email: 'billing@globallogistics.com',
    phone: '+1 (555) 210-4478',
    subtotal: 8900.5,
    taxRate: 0,
    tax: 0,
    total: 8900.5,
    paid: 0,
    due: 8900.5,
    status: 'Unpaid',
    generatedOn: 'Nov 02, 2026',
    lineItems: [
      { slNo: '01', date: 'Oct 04, 2026', weightKg: 512.3, rate: kgRate, amount: 6147.6 },
      { slNo: '02', date: 'Oct 11, 2026', weightKg: 229.4, rate: kgRate, amount: 2752.8 },
    ],
    payments: [],
  },
  {
    id: 'inv-3',
    customer: 'TechFlow Inc',
    tone: 2,
    invoiceId: 'INV-2026-0044',
    period: 'Sep 15 - Oct 15, 2026',
    billingPeriod: 'Sep 2026',
    dateIssued: 'Oct 15, 2026',
    dueDate: 'Nov 14, 2026',
    address: '4500 Innovation Blvd\nAustin, TX 78701',
    email: 'ap@techflow.io',
    phone: '+1 (555) 890-1123',
    subtotal: 24000,
    taxRate: 0,
    tax: 0,
    total: 24000,
    paid: 10000,
    due: 14000,
    status: 'Partial',
    generatedOn: 'Oct 16, 2026',
    lineItems: [
      { slNo: '01', date: 'Oct 02, 2026', weightKg: 450.5, rate: kgRate, amount: 5406 },
      { slNo: '02', date: 'Oct 05, 2026', weightKg: 320, rate: kgRate, amount: 3840 },
      { slNo: '03', date: 'Oct 12, 2026', weightKg: 610.2, rate: kgRate, amount: 7322.4 },
      { slNo: '04', date: 'Oct 18, 2026', weightKg: 290, rate: kgRate, amount: 3480 },
      { slNo: '05', date: 'Oct 22, 2026', weightKg: 329.3, rate: kgRate, amount: 3951.6 },
    ],
    payments: [
      { amount: 10000, date: 'Oct 25, 2026', method: 'Bank Transfer', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-4',
    customer: 'Nexus Retail',
    tone: 3,
    invoiceId: 'INV-2026-0045',
    period: 'Oct 1 - Oct 31, 2026',
    billingPeriod: 'Oct 2026',
    dateIssued: 'Oct 15, 2026',
    dueDate: 'Nov 14, 2026',
    address: '12 Market Square\nColumbus, OH 43215',
    email: 'accounts@nexusretail.com',
    phone: '+1 (555) 334-8890',
    subtotal: 3200,
    taxRate: 0,
    tax: 0,
    total: 3200,
    paid: 3200,
    due: 0,
    status: 'Paid',
    generatedOn: 'Nov 03, 2026',
    lineItems: [
      { slNo: '01', date: 'Oct 03, 2026', weightKg: 160, rate: kgRate, amount: 1920 },
      { slNo: '02', date: 'Oct 10, 2026', weightKg: 106.7, rate: kgRate, amount: 1280 },
    ],
    payments: [
      { amount: 3200, date: 'Nov 03, 2026', method: 'Card Payment', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-5',
    customer: 'BluePeak Industries',
    tone: 0,
    invoiceId: 'INV-2026-0046',
    period: 'Oct 1 - Oct 31, 2026',
    billingPeriod: 'Oct 2026',
    dateIssued: 'Oct 15, 2026',
    dueDate: 'Nov 14, 2026',
    address: '77 Peak Point Rd\nDenver, CO 80202',
    email: 'finance@bluepeak.com',
    phone: '+1 (555) 772-3310',
    subtotal: 18750,
    taxRate: 0,
    tax: 0,
    total: 18750,
    paid: 7500,
    due: 11250,
    status: 'Partial',
    generatedOn: 'Nov 04, 2026',
    lineItems: [
      { slNo: '01', date: 'Oct 06, 2026', weightKg: 700, rate: kgRate, amount: 8400 },
      { slNo: '02', date: 'Oct 13, 2026', weightKg: 550, rate: kgRate, amount: 6600 },
      { slNo: '03', date: 'Oct 20, 2026', weightKg: 312.5, rate: kgRate, amount: 3750 },
    ],
    payments: [
      { amount: 7500, date: 'Oct 30, 2026', method: 'Bank Transfer', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-6',
    customer: 'Orbit Exports',
    tone: 1,
    invoiceId: 'INV-2026-0047',
    period: 'Sep 1 - Sep 30, 2026',
    billingPeriod: 'Sep 2026',
    dateIssued: 'Sep 15, 2026',
    dueDate: 'Oct 15, 2026',
    address: '301 Harbor Loop\nSeattle, WA 98101',
    email: 'billing@orbitexports.com',
    phone: '+1 (555) 908-2234',
    subtotal: 5400,
    taxRate: 0,
    tax: 0,
    total: 5400,
    paid: 5400,
    due: 0,
    status: 'Paid',
    generatedOn: 'Oct 02, 2026',
    lineItems: [
      { slNo: '01', date: 'Sep 04, 2026', weightKg: 250, rate: kgRate, amount: 3000 },
      { slNo: '02', date: 'Sep 18, 2026', weightKg: 200, rate: kgRate, amount: 2400 },
    ],
    payments: [
      { amount: 5400, date: 'Oct 01, 2026', method: 'Wire Transfer', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-7',
    customer: 'Vertex Traders',
    tone: 2,
    invoiceId: 'INV-2026-0048',
    period: 'Sep 1 - Sep 30, 2026',
    billingPeriod: 'Sep 2026',
    dateIssued: 'Sep 15, 2026',
    dueDate: 'Oct 15, 2026',
    address: '56 Commerce St\nChicago, IL 60601',
    email: 'ap@vertextraders.com',
    phone: '+1 (555) 456-7789',
    subtotal: 16200.75,
    taxRate: 0,
    tax: 0,
    total: 16200.75,
    paid: 0,
    due: 16200.75,
    status: 'Unpaid',
    generatedOn: 'Oct 05, 2026',
    lineItems: [
      { slNo: '01', date: 'Sep 03, 2026', weightKg: 640.2, rate: kgRate, amount: 7682.4 },
      { slNo: '02', date: 'Sep 17, 2026', weightKg: 560.1, rate: kgRate, amount: 6721.2 },
      { slNo: '03', date: 'Sep 25, 2026', weightKg: 149.8, rate: kgRate, amount: 1797.6 },
    ],
    payments: [],
  },
  {
    id: 'inv-8',
    customer: 'Summit Foods',
    tone: 3,
    invoiceId: 'INV-2026-0049',
    period: 'Aug 1 - Aug 31, 2026',
    billingPeriod: 'Aug 2026',
    dateIssued: 'Aug 15, 2026',
    dueDate: 'Sep 14, 2026',
    address: '900 Garden Ave\nPortland, OR 97205',
    email: 'billing@summitfoods.com',
    phone: '+1 (555) 664-0090',
    subtotal: 9800,
    taxRate: 0,
    tax: 0,
    total: 9800,
    paid: 9800,
    due: 0,
    status: 'Paid',
    generatedOn: 'Sep 01, 2026',
    lineItems: [
      { slNo: '01', date: 'Aug 05, 2026', weightKg: 430, rate: kgRate, amount: 5160 },
      { slNo: '02', date: 'Aug 19, 2026', weightKg: 386.7, rate: kgRate, amount: 4640 },
    ],
    payments: [
      { amount: 9800, date: 'Aug 31, 2026', method: 'Bank Transfer', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-9',
    customer: 'Quantum Pharma',
    tone: 0,
    invoiceId: 'INV-2026-0050',
    period: 'Aug 1 - Aug 31, 2026',
    billingPeriod: 'Aug 2026',
    dateIssued: 'Aug 15, 2026',
    dueDate: 'Sep 14, 2026',
    address: '402 Lab Lane\nRaleigh, NC 27601',
    email: 'finance@quantumpharma.com',
    phone: '+1 (555) 221-5566',
    subtotal: 22100,
    taxRate: 0,
    tax: 0,
    total: 22100,
    paid: 12100,
    due: 10000,
    status: 'Partial',
    generatedOn: 'Sep 04, 2026',
    lineItems: [
      { slNo: '01', date: 'Aug 07, 2026', weightKg: 810, rate: kgRate, amount: 9720 },
      { slNo: '02', date: 'Aug 21, 2026', weightKg: 650, rate: kgRate, amount: 7800 },
      { slNo: '03', date: 'Aug 28, 2026', weightKg: 381.7, rate: kgRate, amount: 4580 },
    ],
    payments: [
      { amount: 12100, date: 'Sep 02, 2026', method: 'Bank Transfer', receivedBy: 'Admin' },
    ],
  },
  {
    id: 'inv-10',
    customer: 'Stellar Motors',
    tone: 1,
    invoiceId: 'INV-2026-0051',
    period: 'Aug 1 - Aug 31, 2026',
    billingPeriod: 'Aug 2026',
    dateIssued: 'Aug 15, 2026',
    dueDate: 'Sep 14, 2026',
    address: '11 Turbo Drive\nDetroit, MI 48226',
    email: 'ap@stellarmotors.com',
    phone: '+1 (555) 334-2201',
    subtotal: 7600,
    taxRate: 0,
    tax: 0,
    total: 7600,
    paid: 0,
    due: 7600,
    status: 'Unpaid',
    generatedOn: 'Sep 06, 2026',
    lineItems: [
      { slNo: '01', date: 'Aug 08, 2026', weightKg: 360, rate: kgRate, amount: 4320 },
      { slNo: '02', date: 'Aug 22, 2026', weightKg: 273.3, rate: kgRate, amount: 3280 },
    ],
    payments: [],
  },
]
