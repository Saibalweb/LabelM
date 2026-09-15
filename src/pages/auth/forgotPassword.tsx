import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { TextField } from '@/components/auth/TextField'
import { Button } from '@/components/ui/button'
import { useAppDispatch } from '@/store/hooks'
import { requestPasswordReset } from '@/store/slices/authSlice'

export function ForgotPassword() {
  const dispatch = useAppDispatch()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    await dispatch(requestPasswordReset({ email }))
    setSubmitting(false)
    setSent(true)
  }

  return (
    <AuthLayout
      title={sent ? 'Reset link sent' : 'Reset your password'}
      subtitle={
        sent
          ? undefined
          : "Enter your work email and we'll send you a reset link."
      }
    >
      {sent ? (
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
            <MailCheck className="size-7" />
          </span>
          <p className="mt-5 font-body-md text-body-md text-on-surface-variant">
            Check <span className="font-mono font-semibold text-on-surface">{email}</span> for
            instructions to reset your password.
          </p>
          <div className="mt-7 w-full space-y-3">
            <Button
              asChild
              className="h-13 w-full rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
            >
              <Link to="/login">Back to sign in</Link>
            </Button>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="block w-full py-2 text-center font-label-md text-label-md text-primary hover:underline"
            >
              Resend link
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField
            id="email"
            label="Work email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.com"
            icon={<Mail className="size-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            disabled={submitting}
            className="h-13 w-full rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 font-label-md text-label-md text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
