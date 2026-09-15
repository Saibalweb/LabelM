import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { QrCode } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { hasRole, type Role } from '@/lib/auth'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <span className="flex size-12 animate-pulse items-center justify-center rounded-xl bg-primary text-on-primary">
        <QrCode className="size-6" />
      </span>
      <p className="font-label-md text-label-md text-on-surface-variant">Loading workspace…</p>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, bootstrapped } = useAppSelector((state) => state.auth)
  const location = useLocation()

  if (!bootstrapped || status === 'loading') return <FullScreenLoader />

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

export function RequireRole({
  role,
  children,
}: {
  role: Role
  children: ReactNode
}) {
  const user = useAppSelector((state) => state.auth.user)

  if (!hasRole(user?.role, role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
