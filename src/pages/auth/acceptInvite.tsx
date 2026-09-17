import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Info, KeyRound, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { TextField } from '@/components/auth/TextField'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authService } from '@/services/auth'

const DEFAULT_ERROR = 'Unable to accept the invitation. Please try again.'

export function AcceptInvite() {
  const location = useLocation()
  const invitedEmail = (location.state as { email?: string } | null)?.email ?? ''

  const [name, setName] = useState('')
  const [email] = useState(invitedEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = name.trim().length > 1 && password.length >= 8 && password === confirm

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setError(null)
    setSubmitting(true)
    try {
      await authService.acceptInvite({ name, email: email || 'new.member@company.com', password })
      toast.success(`Welcome aboard, ${name.split(' ')[0]}!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : DEFAULT_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome to LabelMaster Pro"
      subtitle="You've been invited to join this workspace."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
          <div>
            <p className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
              Assigned role
            </p>
            <p className="font-body-md text-body-md text-on-surface">Workspace access</p>
          </div>
          <Badge className="rounded-md bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant">
            Staff
          </Badge>
        </div>

        <TextField
          id="name"
          label="Full name"
          autoComplete="name"
          required
          placeholder="Jane Doe"
          icon={<User className="size-5" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          readOnly
          placeholder="name@company.com"
          icon={<Mail className="size-5" />}
          value={email}
          className="cursor-not-allowed bg-surface-container text-on-surface-variant"
        />

        <TextField
          id="password"
          label="Create password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          icon={<KeyRound className="size-5" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <TextField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          icon={<KeyRound className="size-5" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          hint={
            confirm && confirm !== password ? (
              <p className="font-label-sm text-label-sm text-destructive">Passwords do not match.</p>
            ) : null
          }
        />

        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-destructive">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p className="font-label-sm text-label-sm">{error}</p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!valid || submitting}
          className="h-13 w-full rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
        >
          {submitting ? 'Setting up…' : 'Accept invitation & sign in'}
        </Button>

        <p className="text-center font-label-sm text-label-sm text-outline">
          By joining you agree to your company's data policy.
        </p>
      </form>
    </AuthLayout>
  )
}
