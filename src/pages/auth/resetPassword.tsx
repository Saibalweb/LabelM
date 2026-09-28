import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { TextField } from '@/components/auth/TextField'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/store/hooks'
import { authService } from '@/services/auth'
import { passwordChecks, scorePassword, STRENGTH_LABELS } from '@/lib/password'
import { cn } from '@/lib/utils'

export function ResetPassword() {
  const navigate = useNavigate()
  const status = useAppSelector((state) => state.auth.status)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const score = useMemo(() => scorePassword(password), [password])
  const checks = passwordChecks(password)
  const valid = checks.every((c) => c.ok) && password === confirm && password.length > 0

  const needsSession = status !== 'authenticated' && status !== 'restricted'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await authService.updatePassword(password)
      toast.success('Password updated. You can sign in now.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex items-start gap-2 rounded-lg bg-tertiary-container/40 px-3.5 py-2.5 text-on-tertiary-container">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="font-label-sm text-label-sm">
            Reset links expire after 15 minutes. Request a new one if this link no longer works.
          </p>
        </div>

        {needsSession ? (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p className="font-label-sm text-label-sm">
              This reset link is invalid or expired. Please request a new one.
            </p>
          </div>
        ) : null}

        <TextField
          id="password"
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
          <div className="space-y-2">
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
          </div>
        ) : null}

        <TextField
          id="confirm"
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
              <p className="font-label-sm text-label-sm text-destructive">Passwords do not match.</p>
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

        <Button
          type="submit"
          disabled={!valid || submitting}
          className="h-13 w-full rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </Button>

        <Link
          to="/login"
          className="block text-center font-label-md text-label-md text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  )
}
