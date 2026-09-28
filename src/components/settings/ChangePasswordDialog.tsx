import { useMemo, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/auth/TextField'
import { authService } from '@/services/auth'
import { passwordChecks, scorePassword, STRENGTH_LABELS } from '@/lib/password'
import { cn } from '@/lib/utils'

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const score = useMemo(() => scorePassword(password), [password])
  const checks = passwordChecks(password)
  const valid = checks.every((c) => c.ok) && password === confirm && password.length > 0

  function reset() {
    setPassword('')
    setConfirm('')
    setShowPassword(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await authService.updatePassword(password)
      toast.success('Password updated successfully.')
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="gap-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-0 sm:max-w-md">
        <DialogHeader className="flex-row items-start gap-3 border-b border-outline-variant p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <KeyRound className="size-5" />
          </span>
          <div>
            <DialogTitle className="font-headline-md text-headline-md text-on-surface">
              Change password
            </DialogTitle>
            <DialogDescription className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Choose a strong new password for your account.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form className="space-y-5 p-5" onSubmit={handleSubmit}>
          <TextField
            id="new-password"
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            icon={<KeyRound className="size-5" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center text-outline transition hover:text-on-surface"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            }
          />

          {password ? (
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-full flex-1 rounded-full transition-colors',
                      i < score
                        ? score <= 1
                          ? 'bg-destructive'
                          : score === 2
                            ? 'bg-tertiary'
                            : 'bg-secondary'
                        : 'bg-surface-container-high'
                    )}
                  />
                ))}
              </div>
              <span className="w-16 text-right font-label-sm text-label-sm text-on-surface-variant">
                {STRENGTH_LABELS[score]}
              </span>
            </div>
          ) : null}

          <TextField
            id="confirm-password"
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            icon={<ShieldCheck className="size-5" />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            hint={
              confirm && confirm !== password ? (
                <p className="font-label-sm text-label-sm text-destructive">
                  Passwords do not match.
                </p>
              ) : null
            }
          />

          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full',
                    c.ok ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-outline'
                  )}
                >
                  <Check className="size-3" />
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{c.label}</span>
              </li>
            ))}
          </ul>

          <DialogFooter className="mx-0 mb-0 flex-col-reverse gap-2 rounded-none border-0 bg-transparent p-0 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl px-5 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!valid || submitting}
              className="h-11 rounded-xl bg-primary px-6 font-body-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
            >
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
