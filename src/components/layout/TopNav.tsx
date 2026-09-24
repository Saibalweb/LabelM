import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CircleHelp,
  LogOut,
  Search,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/store/hooks'
import { hasRole, initialsOf, roleLabels } from '@/lib/roles'
import { authService } from '@/services/auth'
import { cn } from '@/lib/utils'

interface TopNavProps {
  title?: string
  titleClassName?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  backTo?: string
}

function UserMenu() {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!user) return null

  async function handleSignOut() {
    setOpen(false)
    try {
      await authService.signOut()
    } finally {
      toast.success('Signed out')
      navigate('/login', { replace: true })
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-primary-container font-label-md text-label-md text-on-primary-container transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2"
      >
        {initialsOf(user.name)}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-outline-variant bg-surface-container-lowest py-1.5 shadow-xl">
          <div className="border-b border-outline-variant/60 px-4 py-3">
            <p className="truncate font-body-md text-body-md font-semibold text-on-surface">
              {user.name}
            </p>
            <p className="truncate font-label-sm text-label-sm font-mono text-on-surface-variant">
              {user.email}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">
              {roleLabels[user.role]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/settings')
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
          >
            <Settings className="size-4" />
            Profile &amp; settings
          </button>
          {hasRole(user.role, 'admin') ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/team')
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
            >
              <BadgeCheck className="size-4" />
              Team
            </button>
          ) : null}
          <div className="my-1 h-px bg-surface-container-high" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function TopNav({
  title,
  titleClassName,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  backTo,
}: TopNavProps) {
  const navigate = useNavigate()

  return (
    <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-4 lg:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backTo ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => navigate(backTo)}
            className="size-10 shrink-0 rounded-full text-on-surface-variant hover:bg-surface-container-high active:opacity-80 md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Button>
        ) : (
          <span className="truncate font-headline-md text-headline-md font-bold text-primary md:hidden">
            LabelMaster Pro
          </span>
        )}

        {title ? (
          <h2
            className={cn(
              'hidden truncate font-headline-md text-headline-md text-on-surface md:block',
              titleClassName
            )}
          >
            {title}
          </h2>
        ) : null}

        {searchable ? (
          <div className="relative hidden w-64 md:block">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
              <Search className="size-5" />
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded border border-outline-variant bg-surface-container-low pr-4 pl-10 font-body-md text-body-md text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high active:opacity-80"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="mr-2 size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high active:opacity-80"
          aria-label="Help"
        >
          <CircleHelp className="size-5" />
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}

export function MobileSearchBar({
  placeholder = 'Search...',
  value = '',
  onChange,
}: {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="border-b border-outline-variant bg-surface px-4 py-3 md:hidden">
      <div className="relative">
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
          <Search className="size-5" />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-outline-variant bg-surface-container-high pr-4 pl-10 font-body-md text-body-md text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>
    </div>
  )
}
