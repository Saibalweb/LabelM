import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ChevronLeft, ChevronRight, MoreVertical, PauseCircle, Plus, SlidersHorizontal, SortAsc } from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  addCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from '@/store/slices/customersSlice'
import type { Customer, CustomerCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const categories: Array<CustomerCategory | 'All'> = ['All', 'B2B', 'Retail', 'Wholesale']

const avatarStyles = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-primary-fixed-dim text-on-primary-fixed',
]

export function Customers() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((state) => state.customers)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CustomerCategory | 'All'>('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((customer) => {
      const matchesCategory = activeCategory === 'All' || customer.category === activeCategory
      const matchesQuery =
        !q ||
        [customer.name, customer.company, customer.email, customer.phone, customer.address]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q))
      return matchesCategory && matchesQuery
    })
  }, [items, query, activeCategory])

  const handleOpenAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (customer: Customer) => {
    setEditing(customer)
    setDialogOpen(true)
  }

  const handleSubmit = async (input: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      if (editing) {
        await dispatch(updateCustomer({ id: editing.id, patch: input })).unwrap()
        toast.success('Customer updated')
      } else {
        await dispatch(addCustomer(input)).unwrap()
        toast.success('Customer added')
      }
      await dispatch(fetchCustomers())
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleDelete = async (customer: Customer) => {
    try {
      await dispatch(deleteCustomer(customer.id)).unwrap()
      await dispatch(fetchCustomers())
      toast.success('Customer deleted')
    } catch {
      toast.error('Something went wrong')
    }
  }

  const loading = status === 'loading' || status === 'idle'

  return (
    <div className="flex h-full flex-col">
      <TopNav
        searchable
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search customers..."
      />
      <MobileSearchBar value={query} onChange={setQuery} placeholder="Search customers..." />

      <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Customers</h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Manage client records, contacts, and categorization.
              </p>
            </div>
            <Button
              type="button"
              className="h-[52px] min-h-[52px] gap-2 rounded px-6 font-label-md text-label-md"
              onClick={handleOpenAdd}
            >
              <Plus className="size-5" />
              New Customer
            </Button>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'flex min-h-12 items-center gap-2 rounded-full border px-4 font-label-sm text-label-sm transition-colors',
                    activeCategory === category
                      ? 'border-outline-variant bg-surface-container-high text-on-surface'
                      : 'border-transparent bg-surface-container text-on-surface-variant hover:border-outline-variant'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-h-12 min-w-12 items-center justify-center rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
                aria-label="Filter"
              >
                <SlidersHorizontal className="size-5" />
              </button>
              <button
                type="button"
                className="flex min-h-12 min-w-12 items-center justify-center rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
                aria-label="Sort"
              >
                <SortAsc className="size-5" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                    <th className="min-w-[200px] p-4 font-medium">Customer Name</th>
                    <th className="min-w-[150px] p-4 font-medium">Company</th>
                    <th className="min-w-[200px] p-4 font-medium">Contact Email</th>
                    <th className="min-w-[120px] p-4 font-medium">Category</th>
                    <th className="min-w-[120px] p-4 font-medium">Status</th>
                    <th className="w-16 p-4 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant font-body-md text-body-md text-on-surface">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="h-16">
                        <td className="p-4" colSpan={6}>
                          <div className="h-8 animate-pulse rounded bg-surface-container" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                        {query || activeCategory !== 'All'
                          ? 'No customers match your filters.'
                          : 'No customers yet. Add your first customer.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((customer, index) => (
                      <tr key={customer.id} className="group h-16 transition-colors hover:bg-surface-bright">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-full font-headline-md text-headline-md',
                                avatarStyles[index % avatarStyles.length]
                              )}
                            >
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-label-md text-label-md text-on-surface-variant">
                          {customer.company || '—'}
                        </td>
                        <td className="p-4 text-on-surface-variant">
                          {customer.email || '—'}
                        </td>
                        <td className="p-4">
                          {customer.category ? (
                            <span className="rounded bg-surface-container-highest px-2 py-1 font-label-sm text-label-sm text-on-surface">
                              {customer.category}
                            </span>
                          ) : (
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              —
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {customer.status === 'active' ? (
                            <span className="flex items-center gap-1 text-secondary">
                              <CheckCircle2 className="size-4" />
                              <span className="font-label-sm text-label-sm">Active</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-outline">
                              <PauseCircle className="size-4" />
                              <span className="font-label-sm text-label-sm">Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-12 text-on-surface-variant hover:text-primary"
                                aria-label={`Actions for ${customer.name}`}
                              >
                                <MoreVertical className="size-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{customer.name}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Choose an action for this customer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="grid gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleOpenEdit(customer)}
                                >
                                  Edit customer
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => handleDelete(customer)}
                                >
                                  Delete customer
                                </Button>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Close</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-surface-variant bg-surface-container-lowest p-4">
              <span className="font-body-md text-body-md text-on-surface-variant">
                Showing 1-{filtered.length} of {items.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  className="flex min-h-12 items-center justify-center rounded border border-outline-variant px-3 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  className="flex min-h-12 items-center justify-center rounded border border-outline-variant px-3 text-on-surface-variant transition-colors hover:bg-surface-container"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </div>
  )
}