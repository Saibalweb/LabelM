import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  TriangleAlert,
  Undo2,
  Users,
} from 'lucide-react'
import { TopNav, MobileSearchBar } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  useAddCustomer,
  useCustomersQuery,
  useDeleteCustomer,
  useDeletedCustomersQuery,
  useRestoreCustomer,
  useSetCustomerRate,
  useUpdateCustomer,
} from '@/hooks/queries'
import { useAppSelector } from '@/store/hooks'
import { hasRole } from '@/lib/roles'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { Customer, CustomerInput, DeletedCustomer } from '@/lib/types'
import { cn } from '@/lib/utils'

const avatarStyles = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-primary-fixed-dim text-on-primary-fixed',
]

export function Customers() {
  const { data: items = [], isPending: loading } = useCustomersQuery()
  const addCustomer = useAddCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const restoreCustomer = useRestoreCustomer()
  const setCustomerRate = useSetCustomerRate()
  const role = useAppSelector((state) => state.auth.user?.role)
  const canManage = hasRole(role, 'admin')
  const { data: deletedItems = [] } = useDeletedCustomersQuery(canManage)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [priceOpen, setPriceOpen] = useState(false)
  const [priceCustomer, setPriceCustomer] = useState<Customer | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [menuCustomer, setMenuCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.address]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    )
  }, [items, query])

  const handleOpenAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (customer: Customer) => {
    setEditing(customer)
    setDialogOpen(true)
  }

  const handleSubmit = async (input: CustomerInput) => {
    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, patch: input })
        toast.success('Customer updated')
      } else {
        await addCustomer.mutateAsync(input)
        toast.success('Customer added')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleDelete = async (customer: Customer) => {
    try {
      await deleteCustomer.mutateAsync(customer.id)
      toast.success('Customer deleted')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleRestore = async (customer: DeletedCustomer) => {
    try {
      await restoreCustomer.mutateAsync(customer.id)
      toast.success(`Customer #${customer.id} restored`)
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleOpenPrice = (customer: Customer) => {
    setPriceCustomer(customer)
    setPriceValue(customer.currentRate != null ? String(customer.currentRate) : '')
    setPriceOpen(true)
  }

  const handleSavePrice = async () => {
    if (!priceCustomer) return
    const rate = Number(priceValue)
    if (!priceValue.trim() || Number.isNaN(rate) || rate < 0) {
      toast.error('Enter a valid rate.')
      return
    }
    try {
      await setCustomerRate.mutateAsync({ customerId: priceCustomer.id, rate })
      toast.success('Rate updated')
      setPriceOpen(false)
    } catch {
      toast.error('Could not update rate')
    }
  }

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
                Manage clients and their per-kg rate. Press the number on the label screen to pick one.
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

          {!loading && items.length === 0 ? (
            <EmptyState
              icon={<Users className="size-9" />}
              title="No customers yet"
              description="Add your first customer with their rate to start generating labels."
              actionLabel="Add your first customer"
              onAction={handleOpenAdd}
            />
          ) : (
          <div className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                    <th className="w-16 p-4 font-medium">#</th>
                    <th className="min-w-[200px] p-4 font-medium">Customer Name</th>
                    <th className="min-w-[140px] p-4 font-medium">Phone</th>
                    <th className="min-w-[200px] p-4 font-medium">Email</th>
                    <th className="min-w-[180px] p-4 font-medium">Address</th>
                    <th className="min-w-[140px] p-4 font-medium">Rate (₹/kg)</th>
                    <th className="w-16 p-4 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant font-body-md text-body-md text-on-surface">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="h-16">
                        <td className="p-4" colSpan={7}>
                          <div className="h-8 animate-pulse rounded bg-surface-container" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                        No customers match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((customer, index) => (
                      <tr key={customer.id} className="group h-16 transition-colors hover:bg-surface-bright">
                        <td className="p-4">
                          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-container font-label-md text-label-md font-bold text-on-primary-container">
                            {customer.id}
                          </span>
                        </td>
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
                        <td className="p-4 text-on-surface-variant">{customer.phone || '—'}</td>
                        <td className="p-4 text-on-surface-variant">{customer.email || '—'}</td>
                        <td className="p-4 text-on-surface-variant">{customer.address || '—'}</td>
                        <td className="p-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenPrice(customer)}
                            className="h-9 gap-2 rounded border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md text-on-surface hover:bg-surface-container"
                          >
                            {customer.currentRate != null
                              ? formatCurrency(customer.currentRate)
                              : 'Set rate'}
                            <Pencil className="size-3.5 text-on-surface-variant" />
                          </Button>
                        </td>
                        <td className="p-4 text-center">
                          <AlertDialog
                            open={menuCustomer?.id === customer.id}
                            onOpenChange={(open) => {
                              if (!open) setMenuCustomer(null)
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-12 text-on-surface-variant hover:text-primary"
                                aria-label={`Actions for ${customer.name}`}
                                onClick={() => setMenuCustomer(customer)}
                              >
                                <MoreVertical className="size-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {menuCustomer?.name ?? customer.name}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Choose an action for this customer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="grid gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    setMenuCustomer(null)
                                    handleOpenEdit(customer)
                                  }}
                                >
                                  Edit customer
                                </Button>
                                {canManage ? (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    className="w-full gap-2"
                                    onClick={() => {
                                      setMenuCustomer(null)
                                      setDeleteTarget(customer)
                                    }}
                                  >
                                    <TriangleAlert className="size-4" />
                                    Delete customer
                                  </Button>
                                ) : null}
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
                Showing {filtered.length} of {items.length}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="min-h-12 rounded border-outline-variant px-3 text-on-surface-variant hover:bg-surface-container"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 rounded border-outline-variant px-3 text-on-surface-variant hover:bg-surface-container"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </div>
          </div>
          )}

          {canManage ? (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
                  <TriangleAlert className="size-5 text-destructive" />
                  Deleted customers
                </h3>
                <span className="font-label-md text-label-md text-on-surface-variant">
                  {deletedItems.length > 0 ? `${deletedItems.length} archived` : ''}
                </span>
              </div>
              {deletedItems.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No deleted customers. Deleted customers and their full history can be restored
                  from here.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-surface-variant bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                          <th className="w-16 p-4 font-medium">#</th>
                          <th className="min-w-[200px] p-4 font-medium">Customer Name</th>
                          <th className="min-w-[140px] p-4 font-medium">Phone</th>
                          <th className="min-w-[160px] p-4 font-medium">Deleted on</th>
                          <th className="min-w-[140px] p-4 font-medium">Deleted by</th>
                          <th className="w-28 p-4 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-variant font-body-md text-body-md text-on-surface">
                        {deletedItems.map((customer) => (
                          <tr key={customer.id} className="group h-16 transition-colors hover:bg-surface-bright">
                            <td className="p-4">
                              <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md font-bold text-on-secondary-container">
                                {customer.id}
                              </span>
                            </td>
                            <td className="p-4 font-medium">{customer.name}</td>
                            <td className="p-4 text-on-surface-variant">{customer.phone || '—'}</td>
                            <td className="p-4 text-on-surface-variant">
                              {formatDateTime(customer.deleted_at)}
                            </td>
                            <td className="p-4 text-on-surface-variant">
                              {customer.deleted_by_name || '—'}
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 gap-2 rounded border-outline-variant px-3 font-label-md text-label-md text-on-surface hover:bg-surface-container"
                                onClick={() => handleRestore(customer)}
                              >
                                <Undo2 className="size-4 text-primary" />
                                Restore
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

        </div>
      </main>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editing={editing}
      />

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Rate</DialogTitle>
            <DialogDescription>
              {priceCustomer ? `${priceCustomer.name} · ₹ per kg` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="price-rate">Rate (₹ per kg)</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-on-surface-variant">
                ₹
              </span>
              <Input
                id="price-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder="e.g. 120.00"
                className="pl-7"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSavePrice}>
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" />
              Delete customer?
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `&ldquo;${deleteTarget.name}&rdquo; (#${deleteTarget.id}) will be archived.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <ul className="space-y-2.5 font-body-sm text-body-sm text-on-surface">
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                Removed from the customer list immediately.
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                All labels, invoices, payments and unpaid dues for this customer become hidden
                from every screen.
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                No data is erased — every record stays preserved in the database.
              </li>
            </ul>
          </div>
          <p className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <Undo2 className="size-4 shrink-0" />
            Only an owner or admin can restore this customer and its full history.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget)
              }}
            >
              <TriangleAlert className="size-4" />
              Delete customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}