import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Phone, Printer, Save, Search, X } from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Label as FormLabel } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setDraft, resetDraft } from '@/store/slices/draftSlice'
import { createLabel, fetchLabels } from '@/store/slices/labelsSlice'
import { addCustomer, fetchCustomers } from '@/store/slices/customersSlice'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

const inputClasses =
  'w-full h-14 px-4 bg-surface-container-lowest border border-outline-variant rounded font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant'

export function Create() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { draft } = useAppSelector((state) => state.draft)
  const { items } = useAppSelector((state) => state.labels)
  const customers = useAppSelector((state) => state.customers.items)

  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const slNo = useMemo(() => {
    if (draft.slNo) return draft.slNo
    const max = items.reduce((acc, label) => {
      const match = label.slNo.match(/(\d+)$/)
      const num = match ? Number(match[1]) : 0
      return Math.max(acc, num)
    }, 0)
    return `LBL-${String(max + 1).padStart(4, '0')}-AX`
  }, [draft.slNo, items])

  const weight = parseFloat(draft.totalWeightKg) || 0
  const mrp = parseFloat(draft.mrpPerKg) || 0
  const subtotal = weight * mrp
  const tax = subtotal * 0.05
  const total = subtotal + tax

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      [c.name, c.company, c.email].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    )
  }, [customers, customerQuery])

  const update = (patch: Parameters<typeof setDraft>[0]) => {
    dispatch(setDraft(patch))
  }

  const pickCustomer = (customer: (typeof customers)[number]) => {
    update({ customer })
    setCustomerQuery(customer.name)
    setShowCustomerList(false)
  }

  const handleAddCustomer = async (input: Parameters<typeof addCustomer>[0]) => {
    try {
      const created = await dispatch(addCustomer(input)).unwrap()
      await dispatch(fetchCustomers())
      pickCustomer(created)
      toast.success('Customer added')
    } catch {
      toast.error('Could not add customer')
    }
  }

  const handleGenerate = async () => {
    if (!draft.date) {
      toast.error('Please pick a date.')
      return
    }
    if (!draft.customer) {
      toast.error('Please select a customer.')
      return
    }
    if (weight <= 0 || mrp <= 0) {
      toast.error('Enter a valid weight and MRP.')
      return
    }

    const input: Parameters<typeof createLabel>[0] = {
      slNo,
      date: draft.date,
      customerId: draft.customer.id,
      customerName: draft.customer.name,
      productId: draft.productId.trim() || undefined,
      batch: draft.batch.trim() || undefined,
      expDate: draft.expDate.trim() || undefined,
      description: draft.description.trim(),
      totalWeightKg: weight,
      mrpPerKg: mrp,
      status: 'draft',
    }

    try {
      const result = await dispatch(createLabel(input)).unwrap()
      await dispatch(fetchLabels())
      dispatch(resetDraft())
      toast.success(`Label ${result.slNo} generated`)
      navigate(`/preview/${result.id}`)
    } catch {
      toast.error('Failed to generate label.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav
        title="LabelMaster Pro"
        titleClassName="text-primary font-bold"
        searchable
        searchPlaceholder="Search..."
      />
      <MobileSearchBar placeholder="Search..." />

      <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              Create New Label
            </h2>
            <span className="rounded border border-outline-variant bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
              Draft Mode
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                    SL No
                  </FormLabel>
                  <input
                    type="text"
                    value={draft.slNo}
                    onChange={(e) => update({ slNo: e.target.value })}
                    placeholder="Enter SL No..."
                    className={cn(inputClasses, 'font-label-md text-label-md')}
                  />
                </div>
                <div>
                  <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                    Date
                  </FormLabel>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => update({ date: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="relative">
                <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                  Customer / Recipient
                </FormLabel>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant">
                    <Search className="size-5" />
                  </span>
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value)
                      setShowCustomerList(true)
                    }}
                    onFocus={() => setShowCustomerList(true)}
                    onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
                    placeholder="Search customer ID or name..."
                    className={cn(inputClasses, 'pl-12')}
                  />
                </div>

                {draft.customer ? (
                  <div className="relative mt-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Clear customer"
                      onClick={() => {
                        update({ customer: null })
                        setCustomerQuery('')
                      }}
                      className="absolute top-3 right-3 rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    >
                      <X className="size-4" />
                    </Button>
                    <p className="pr-8 font-headline-md text-headline-md text-on-surface">
                      {draft.customer.name}
                    </p>
                    {draft.customer.address ? (
                      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        {draft.customer.address}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex items-center gap-3">
                      {draft.customer.phone ? (
                        <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                          <Phone className="size-4" />
                          {draft.customer.phone}
                        </span>
                      ) : null}
                      {draft.customer.category ? (
                        <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-secondary-container uppercase">
                          {draft.customer.category}
                        </span>
                      ) : null}
                      {!draft.customer.phone && !draft.customer.category ? (
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {draft.customer.company || draft.customer.email || 'No details'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {showCustomerList ? (
                  <div className="absolute left-0 right-0 z-30 mt-2 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                    {filteredCustomers.length === 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setShowCustomerList(false)
                          setDialogOpen(true)
                        }}
                        className="flex h-auto w-full items-center justify-start gap-3 border-b border-outline-variant rounded-none px-4 py-3 text-left last:border-b-0 hover:bg-surface-container"
                      >
                        <span className="font-label-md text-label-md text-primary">+ Add new customer</span>
                      </Button>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <Button
                          key={customer.id}
                          type="button"
                          variant="ghost"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickCustomer(customer)}
                          className={cn(
                            'flex h-auto w-full items-center justify-start gap-3 border-b border-outline-variant rounded-none px-4 py-3.5 text-left last:border-b-0 hover:bg-surface-container',
                            draft.customer?.id === customer.id && 'bg-surface-container'
                          )}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md text-on-primary-container">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-body-md text-body-md text-on-surface">
                              {customer.name}
                            </span>
                            <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
                              {customer.company || customer.email || 'No details'}
                            </span>
                          </span>
                        </Button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-outline-variant pt-4">
                <div>
                  <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                    Total Weight (kg)
                  </FormLabel>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.totalWeightKg}
                      onChange={(e) => update({ totalWeightKg: e.target.value })}
                      placeholder="0.00"
                      className={cn(inputClasses, 'pr-12 font-label-md text-label-md')}
                    />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 font-label-md text-label-md text-on-surface-variant">
                      kg
                    </span>
                  </div>
                </div>
                <div>
                  <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                    MRP (per kg)
                  </FormLabel>
                  <div className="relative">
                    <span className="absolute top-1/2 left-4 -translate-y-1/2 font-label-md text-label-md text-on-surface-variant">
                      ₹
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.mrpPerKg}
                      onChange={(e) => update({ mrpPerKg: e.target.value })}
                      placeholder="0.00"
                      className={cn(inputClasses, 'pl-8 font-label-md text-label-md')}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <FormLabel className="font-label-md text-label-md text-on-surface-variant">
                  Batch Notes (Optional)
                </FormLabel>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Enter specific batch instructions..."
                  className="w-full resize-none rounded border border-outline-variant bg-surface-container-lowest p-4 font-body-md text-body-md text-on-surface transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-on-surface-variant"
                />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                <h3 className="mb-6 border-b border-outline-variant pb-4 font-headline-md text-headline-md text-on-surface">
                  Summary
                </h3>
                <div className="space-y-4 font-body-md text-body-md">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Base Weight</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {weight.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Rate</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {formatCurrency(mrp)}/kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Tax (VAT 5%)</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {formatCurrency(tax)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
                    <span className="font-headline-md text-headline-md text-on-surface">
                      Total Price
                    </span>
                    <span className="font-label-md text-headline-md text-primary">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[52px] w-full gap-2 rounded font-body-md text-body-md"
                  onClick={handleGenerate}
                >
                  <Printer className="size-5" />
                  Generate Label
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[52px] w-full gap-2 rounded border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-primary hover:bg-surface-container-low hover:text-primary"
                  onClick={() => toast.info('Saved as draft')}
                >
                  <Save className="size-5" />
                  Save as Draft
                </Button>
              </div>

              <div className="mt-4 flex h-48 flex-col items-center justify-center gap-2 rounded border border-dashed border-outline-variant bg-surface p-4 text-center">
                <span className="text-4xl text-outline">◱</span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Label preview will generate here
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAddCustomer} />
    </div>
  )
}