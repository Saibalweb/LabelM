import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Info, KeyRound, Link2, Mail } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { TextField } from '@/components/auth/TextField'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  clearAuthError,
  requestMagicLink,
  signInWithPassword,
} from '@/store/slices/authSlice'

export function Login() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error } = useAppSelector((state) => state.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const submitting = status === 'loading'

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLocalError(null)
    const result = await dispatch(signInWithPassword({ email, password }))
    if (signInWithPassword.fulfilled.match(result)) {
      navigate(from, { replace: true })
    } else if (signInWithPassword.rejected.match(result)) {
      if (result.payload?.code === 'restricted') navigate('/unauthorized')
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setLocalError('Enter your work email first to receive a magic link.')
      return
    }
    setLocalError(null)
    await dispatch(requestMagicLink({ email }))
    navigate('/magic-link-sent', { state: { email } })
  }

  const message = localError ?? error

  return (
    <AuthLayout title="Sign in" subtitle="Use your company account">
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

        <TextField
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
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

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 cursor-pointer rounded border-outline-variant text-primary accent-primary"
            />
            <span className="font-label-md text-label-md text-on-surface-variant">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="font-label-md text-label-md font-semibold text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {message ? (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-destructive">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p className="font-label-sm text-label-sm">{message}</p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={submitting}
          className="h-13 w-full gap-2 rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting ? <ArrowRight className="size-5" /> : null}
        </Button>

        <div className="flex items-center justify-center py-1">
          <div className="h-px flex-1 bg-surface-container-highest" />
          <span className="mx-4 font-label-sm text-label-sm text-outline-variant uppercase">or</span>
          <div className="h-px flex-1 bg-surface-container-highest" />
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={handleMagicLink}
          disabled={submitting}
          className="h-12 w-full gap-2 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface hover:bg-surface-container"
        >
          <Link2 className="size-5 text-outline" />
          Email me a magic link
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/60 p-3.5">
        <p className="font-label-sm text-label-sm font-semibold tracking-wide text-on-surface-variant uppercase">
          Demo accounts
        </p>
        <p className="mt-1.5 font-label-sm text-label-sm text-on-surface-variant">
          owner@labelmaster.test · admin@labelmaster.test · staff@labelmaster.test
        </p>
        <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
          Password: <span className="font-mono text-on-surface">labelmaster</span>
        </p>
      </div>
    </AuthLayout>
  )
}
