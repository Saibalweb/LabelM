import { useEffect, useState } from 'react'
import type { Customer, CustomerCategory, CustomerStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: Omit<Customer, 'id' | 'createdAt'>) => void
  editing?: Customer | null
}

interface FormState {
  name: string
  company: string
  email: string
  phone: string
  address: string
  category: CustomerCategory
  status: CustomerStatus
}

const emptyForm: FormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  category: 'B2B',
  status: 'active',
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editing = null,
}: CustomerFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              company: editing.company ?? '',
              email: editing.email ?? '',
              phone: editing.phone ?? '',
              address: editing.address ?? '',
              category: editing.category ?? 'B2B',
              status: editing.status ?? 'active',
            }
          : emptyForm
      )
      setError('')
    }
  }, [open, editing])

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError('Customer name is required.')
      return
    }
    onSubmit({
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      category: form.category,
      status: form.status,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the customer details below.'
              : 'Add a new customer to use on labels.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                setError('')
              }}
              placeholder="e.g. Acme Corp Logistics"
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-company">Company ID (optional)</Label>
            <Input
              id="customer-company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="ACME-01"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-email">Contact Email (optional)</Label>
            <Input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="billing@acmecorp.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-phone">Phone (optional)</Label>
            <Input
              id="customer-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98110 22334"
              inputMode="tel"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-address">Address (optional)</Label>
            <Input
              id="customer-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="City, State"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, category: value as CustomerCategory }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B">B2B</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex h-10 items-center justify-between rounded-md border border-input px-3">
                <span className="text-sm">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
                <Switch
                  checked={form.status === 'active'}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, status: checked ? 'active' : 'inactive' }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>
            {editing ? 'Save Changes' : 'Add Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}