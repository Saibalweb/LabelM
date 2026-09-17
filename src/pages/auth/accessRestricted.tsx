import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/auth'

export function AccessRestricted() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await authService.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout title="Access restricted">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX className="size-7" />
        </span>
        <p className="mt-5 font-body-md text-body-md text-on-surface-variant">
          Your account isn't authorized for this workspace. Contact your administrator to request
          access.
        </p>
        <div className="mt-7 w-full space-y-3">
          <Button
            type="button"
            onClick={handleSignOut}
            className="h-13 w-full rounded-full bg-primary px-6 font-headline-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
          >
            Sign out
          </Button>
          <a
            href="mailto:support@labelmaster.io"
            className="block w-full py-2 text-center font-label-md text-label-md text-primary hover:underline"
          >
            Contact support
          </a>
        </div>
      </div>
    </AuthLayout>
  )
}
