import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertCircle, CalendarDays, Phone, Printer, Search, X } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Label as FormLabel } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setDraft, resetDraft } from '@/store/slices/draftSlice'
import {
  useAddCustomer,
  useCreateLabel,
  useCustomerSearchQuery,
} from '@/hooks/queries'
import { formatCurrency } from '@/lib/format'
import type { Customer, CustomerInput } from '@/lib/types'
import { cn } from '@/lib/utils'

const inputClasses =
  'w-full h-14 px-4 bg-surface-container-lowest border border-outline-variant rounded font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Create() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { draft } = useAppSelector((state) => state.draft)
  const addCustomer = useAddCustomer()
  const createLabel = useCreateLabel()

  const [customerQuery, setCustomerQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(customerQuery), 150)
    return () => clearTimeout(timer)
  }, [customerQuery])

  useEffect(() => {
    if (!draft.date) dispatch(setDraft({ date: todayISO() }))
  }, [draft.date, dispatch])

  const customer = draft.customer
  const rate = customer?.currentRate ?? null
  const weight = parseFloat(draft.weight) || 0
  const amount = rate != null ? weight * rate : 0
  const missingRate = customer != null && rate == null

  const { data: searchResults = [], isFetching: searchFetching } =
    useCustomerSearchQuery(debouncedQuery)
  const queryPending = customerQuery.trim() !== debouncedQuery.trim()

  const update = (patch: Parameters<typeof setDraft>[0]) => {
    dispatch(setDraft(patch))
  }

  const pickCustomer = (selected: Customer) => {
    update({ customer: selected })
    setShowCustomerList(false)
  }

  const handleCustomerInput = (value: string) => {
    setCustomerQuery(value)
    setShowCustomerList(true)
  }

  const handleAddCustomer = async (input: CustomerInput) => {
    try {
      const created = await addCustomer.mutateAsync(input)
      setCustomerQuery(String(created.id))
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
    if (!customer) {
      toast.error('Select a customer by pressing their number.')
      return
    }
    if (rate == null) {
      toast.error('This customer has no rate. Set it in Customers.')
      return
    }
    if (weight <= 0) {
      toast.error('Enter a valid weight.')
      return
    }

    const input = {
      customerId: customer.id,
      date: draft.date,
      weight,
      rate,
    }

    try {
      const result = await createLabel.mutateAsync(input)
      dispatch(resetDraft())
      toast.success(`Label ${result.slNo} generated`)
      navigate(`/preview/${result.id}`)
    } catch {
      toast.error('Failed to generate label.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Create Label" backTo="/" />

      <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              Create New Label
            </h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Press a customer number, enter the weight — done. Rate and SL No are automatic.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 self-start rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setShowCustomerList(false)
                  }
                }}
              >
                <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                  Customer by number
                </FormLabel>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant">
                    <Search className="size-5" />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customerQuery}
                    onChange={(e) => handleCustomerInput(e.target.value)}
                    onFocus={() => setShowCustomerList(true)}
                    placeholder="Press customer number (e.g. 1)"
                    className={cn(inputClasses, 'pl-12')}
                  />
                </div>

                {customer ? (
                  <div
                    className={cn(
                      'relative mt-3 rounded-lg border border-outline-variant bg-surface-container-low p-4',
                      missingRate && 'border-destructive/40'
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Clear customer"
                      tabIndex={-1}
                      onClick={() => {
                        update({ customer: null })
                        setCustomerQuery('')
                      }}
                      className="absolute top-3 right-3 rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    >
                      <X className="size-4" />
                    </Button>
                    <div className="flex items-center gap-3 pr-8">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md font-bold text-on-primary-container">
                        {customer.id}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-headline-md text-headline-md text-on-surface">
                          {customer.name}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 font-label-md text-label-md',
                            missingRate ? 'text-destructive' : 'text-on-surface-variant'
                          )}
                        >
                          {rate != null
                            ? `${formatCurrency(rate)}/kg`
                            : 'No rate set — set it to generate labels'}
                        </p>
                      </div>
                    </div>
                    {customer.phone || customer.address ? (
                      <div className="mt-2.5 flex items-center gap-3">
                        {customer.phone ? (
                          <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                            <Phone className="size-4" />
                            {customer.phone}
                          </span>
                        ) : null}
                        {customer.address ? (
                          <span className="truncate font-body-sm text-body-sm text-on-surface-variant">
                            {customer.address}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {missingRate ? (
                      <div className="mt-3 flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                        <p className="flex items-center gap-2 font-body-sm text-body-sm text-destructive">
                          <AlertCircle className="size-4 shrink-0" />
                          Rate missing for {customer.name}. Add a rate before generating.
                        </p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          tabIndex={-1}
                          className="self-start"
                          onClick={() => navigate('/customers')}
                        >
                          Set rate in Customers
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {showCustomerList ? (
                  <div className="absolute left-0 right-0 z-30 mt-2 flex max-h-72 flex-col overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                    {debouncedQuery.trim() === '' ? (
                      <div className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                        Type a customer number or name, then pick from the list.
                      </div>
                    ) : queryPending || (searchFetching && searchResults.length === 0) ? (
                      <div className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                        Searching customers…
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col">
                        <div className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                          No customers match &ldquo;{debouncedQuery}&rdquo;.
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setShowCustomerList(false)
                            setDialogOpen(true)
                          }}
                          className="flex h-auto w-full items-center justify-start gap-3 rounded-none border-b border-outline-variant px-4 py-3 text-left last:border-b-0 hover:bg-surface-container"
                        >
                          <span className="font-label-md text-label-md text-primary">+ Add new customer</span>
                        </Button>
                      </div>
                    ) : (
                      searchResults.map((c) => (
                        <Button
                          key={c.id}
                          type="button"
                          variant="ghost"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCustomerQuery(String(c.id))
                            pickCustomer(c)
                          }}
                          className={cn(
                            'flex h-auto w-full items-center justify-start gap-3 rounded-none border-b border-outline-variant px-4 py-3 text-left last:border-b-0 hover:bg-surface-container',
                            customer?.id === c.id && 'bg-surface-container'
                          )}
                        >
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md font-bold text-on-primary-container">
                            {c.id}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-body-md text-body-md text-on-surface">
                              {c.name}
                            </span>
                            <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
                              {c.currentRate != null
                                ? `${formatCurrency(c.currentRate)}/kg`
                                : 'No rate'}
                            </span>
                          </span>
                        </Button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-outline-variant pt-4">
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
                      value={draft.weight}
                      onChange={(e) => update({ weight: e.target.value })}
                      placeholder="0.00"
                      className={cn(
                        inputClasses,
                        'h-16 pr-12 font-headline-lg text-headline-lg font-bold'
                      )}
                    />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 font-label-md text-label-md text-on-surface-variant">
                      kg
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Amount
                    </span>
                    <span
                      className={cn(
                        'font-label-md text-headline-md font-bold',
                        rate != null && weight > 0 ? 'text-primary' : 'text-on-surface-variant'
                      )}
                    >
                      {rate != null && weight > 0 ? formatCurrency(amount) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                <h3 className="mb-6 border-b border-outline-variant pb-4 font-headline-md text-headline-md text-on-surface">
                  Summary
                </h3>
                <div className="mb-6">
                  <FormLabel className="mb-2 block font-label-md text-label-md text-on-surface-variant">
                    Date
                  </FormLabel>
                  <div className="relative">
                    <span className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant">
                      <CalendarDays className="size-5" />
                    </span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => update({ date: e.target.value })}
                      tabIndex={-1}
                      className={cn(inputClasses, 'pl-12')}
                    />
                  </div>
                </div>
                <div className="space-y-4 font-body-md text-body-md">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">SL No</span>
                    <span className="font-label-md text-label-md text-on-surface">Auto (LBL-####)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Customer</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {customer ? `#${customer.id} ${customer.name}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Rate</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {rate != null ? `${formatCurrency(rate)}/kg` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Weight</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {weight > 0 ? `${weight.toFixed(2)} kg` : '—'}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
                    <span className="font-headline-md text-headline-md text-on-surface">
                      Amount
                    </span>
                    <span className="font-label-md text-headline-md text-primary">
                      {rate != null ? formatCurrency(amount) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {missingRate ? (
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  <p className="flex items-center gap-2 font-body-sm text-body-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    Rate missing — set a rate to generate labels.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    tabIndex={-1}
                    className="w-full"
                    onClick={() => navigate('/customers')}
                  >
                    Go to Customers
                  </Button>
                </div>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                disabled={missingRate}
                className={cn(
                  'h-[52px] w-full gap-2 rounded font-body-md text-body-md',
                  missingRate &&
                    'border-destructive/50 bg-destructive/10 text-destructive disabled:opacity-100'
                )}
                onClick={handleGenerate}
              >
                <Printer className="size-5" />
                Generate Label
              </Button>
            </div>
          </div>
        </div>
      </main>

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAddCustomer} />
    </div>
  )
}