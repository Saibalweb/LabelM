import { useEffect, useState } from 'react'
import type { Customer, CustomerInput } from '@/lib/types'
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

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CustomerInput) => void
  editing?: Customer | null
}

interface FormState {
  name: string
  phone: string
  email: string
  address: string
  gst_number: string
  rate: string
}

const emptyForm: FormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gst_number: '',
  rate: '',
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
              phone: editing.phone ?? '',
              email: editing.email ?? '',
              address: editing.address ?? '',
              gst_number: editing.gst_number ?? '',
              rate: editing.currentRate != null ? String(editing.currentRate) : '',
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
    const rate = form.rate.trim()
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      gst_number: form.gst_number.trim() || null,
      rate: rate ? Number(rate) : null,
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
              ? 'Update the customer details and rate below.'
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
              placeholder="e.g. Acme Corp"
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
            <Label htmlFor="customer-email">Email (optional)</Label>
            <Input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="billing@acmecorp.com"
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
          <div className="grid gap-2">
            <Label htmlFor="customer-gst">GST Number (optional)</Label>
            <Input
              id="customer-gst"
              value={form.gst_number}
              onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value }))}
              placeholder="22AAAAA0000A1Z5"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-rate">Rate (₹ per kg)</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-on-surface-variant">
                ₹
              </span>
              <Input
                id="customer-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="e.g. 120.00"
                className="pl-7"
              />
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