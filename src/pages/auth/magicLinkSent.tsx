import { Link, useLocation } from 'react-router-dom'
import { ExternalLink, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'

export function MagicLinkSent() {
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email ?? 'name@company.com'

  return (
    <AuthLayout title="Check your email" subtitle="We've sent you a secure sign-in link.">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <MailCheck className="size-7" />
        </span>
        <p className="mt-5 font-body-md text-body-md text-on-surface-variant">
          We sent a magic link to{' '}
          <span className="font-mono font-semibold text-on-surface">{email}</span>. It expires in 15
          minutes.
        </p>

        <div className="mt-7 w-full space-y-3">
          <Button
            asChild
            className="h-13 w-full gap-2 rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
          >
            <a href="mailto:">
              Open email app
              <ExternalLink className="size-5" />
            </a>
          </Button>
          <Link
            to="/login"
            className="block w-full py-2 text-center font-label-md text-label-md text-primary hover:underline"
          >
            Use a different email
          </Link>
        </div>

        <p className="mt-6 font-label-sm text-label-sm text-outline">
          Didn't get it? Check your spam folder or try again.
        </p>
      </div>
    </AuthLayout>
  )
}
