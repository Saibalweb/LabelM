import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, CircleHelp, Search } from 'lucide-react'
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
    <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-4 lg:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high active:opacity-80 md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </button>
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
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high active:opacity-80"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
        <button
          type="button"
          className="mr-2 flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high active:opacity-80"
          aria-label="Help"
        >
          <CircleHelp className="size-5" />
        </button>
        <div className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-primary-container font-headline-md text-headline-md text-on-primary-container transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2">
          A
        </div>
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