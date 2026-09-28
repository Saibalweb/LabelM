import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
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
import { Label as FieldLabel } from '@/components/ui/label'
import { useCustomersQuery, useUpdateLabel } from '@/hooks/queries'
import { formatCurrency } from '@/lib/format'
import type { Label } from '@/lib/types'

interface LabelEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: Label | null
}

interface FormState {
  customerId: number
  date: string
  weight: string
  rate: string
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function LabelEditDialog({ open, onOpenChange, label }: LabelEditDialogProps) {
  const { data: customers = [] } = useCustomersQuery()
  const updateLabel = useUpdateLabel()

  const [form, setForm] = useState<FormState>({
    customerId: 0,
    date: '',
    weight: '',
    rate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && label) {
      setForm({
        customerId: label.customerId,
        date: label.date,
        weight: String(label.weight),
        rate: String(label.rate),
      })
      setError('')
    }
  }, [open, label])

  const billed = label?.invoiceId != null

  const amount = useMemo(() => {
    const weight = parseFloat(form.weight)
    const rate = parseFloat(form.rate)
    if (!Number.isFinite(weight) || !Number.isFinite(rate)) return 0
    return round2(weight * rate)
  }, [form.weight, form.rate])

  const handleSave = async () => {
    if (!label) return
    if (billed) {
      setError('Invoiced labels cannot be edited.')
      return
    }
    const weight = parseFloat(form.weight)
    const rate = parseFloat(form.rate)
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Enter a valid weight greater than zero.')
      return
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setError('Enter a valid rate.')
      return
    }
    if (!form.date) {
      setError('Pick a date.')
      return
    }

    const patch: Partial<Label> = {}
    if (form.customerId !== label.customerId) patch.customerId = form.customerId
    if (form.date !== label.date) patch.date = form.date
    if (weight !== label.weight) patch.weight = weight
    if (rate !== label.rate) patch.rate = rate

    if (Object.keys(patch).length === 0) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      await updateLabel.mutateAsync({ id: label.id, patch })
      toast.success('Label updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update label.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Label</DialogTitle>
          <DialogDescription>
            {label
              ? `Label ${label.slNo} — changes apply only while the label is uninvoiced.`
              : 'Editing label'}
          </DialogDescription>
        </DialogHeader>

        {billed ? (
          <div className="flex items-start gap-3 rounded-lg border border-tertiary/30 bg-tertiary-container/40 p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-tertiary" />
            <p className="font-body-md text-body-md text-on-tertiary-container">
              This label is already billed to an invoice and cannot be edited.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="label-customer">Customer</FieldLabel>
              <select
                id="label-customer"
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: Number(e.target.value) }))}
                className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    #{customer.id} — {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="label-date">Date</FieldLabel>
              <Input
                id="label-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="h-11 px-4 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <FieldLabel htmlFor="label-weight">Weight (g)</FieldLabel>
                <Input
                  id="label-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  className="h-11 px-4 text-base"
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="label-rate">Rate (₹/g)</FieldLabel>
                <Input
                  id="label-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  className="h-11 px-4 text-base"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
              <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                Amount
              </span>
              <span className="font-headline-md text-headline-md font-bold text-primary">
                {formatCurrency(amount)}
              </span>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={billed || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}