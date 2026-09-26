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
import { cn } from '@/lib/utils'

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

const inputClasses =
  'h-12 rounded-lg border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary'

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline-md text-headline-md text-on-surface">
            {editing ? 'Edit Customer' : 'Add Customer'}
          </DialogTitle>
          <DialogDescription className="font-body-md text-body-md">
            {editing
              ? 'Update the customer details and rate below.'
              : 'Add a new customer to use on labels.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label
              htmlFor="customer-name"
              className="font-label-md text-label-md text-on-surface-variant"
            >
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                setError('')
              }}
              placeholder="e.g. Acme Corp"
              className={inputClasses}
              autoFocus
            />
            {error ? (
              <p className="font-body-sm text-body-sm text-destructive">{error}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label
                htmlFor="customer-phone"
                className="font-label-md text-label-md text-on-surface-variant"
              >
                Phone (optional)
              </Label>
              <Input
                id="customer-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98110 22334"
                inputMode="tel"
                className={inputClasses}
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="customer-email"
                className="font-label-md text-label-md text-on-surface-variant"
              >
                Email (optional)
              </Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="billing@acmecorp.com"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label
                htmlFor="customer-address"
                className="font-label-md text-label-md text-on-surface-variant"
              >
                Address (optional)
              </Label>
              <Input
                id="customer-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="City, State"
                className={inputClasses}
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="customer-gst"
                className="font-label-md text-label-md text-on-surface-variant"
              >
                GST Number (optional)
              </Label>
              <Input
                id="customer-gst"
                value={form.gst_number}
                onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value }))}
                placeholder="22AAAAA0000A1Z5"
                className={cn(inputClasses, 'font-mono')}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="customer-rate"
              className="font-label-md text-label-md text-on-surface-variant"
            >
              Rate (₹ per kg)
            </Label>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">
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
                className={cn(inputClasses, 'pl-9')}
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