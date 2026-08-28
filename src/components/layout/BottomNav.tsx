import { NavLink } from 'react-router-dom'
import { Plus, Tag, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Labels', icon: Tag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  return (
    <div className="md:hidden">
      <NavLink
        to="/create"
        className="fixed right-4 bottom-20 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform active:scale-95"
        aria-label="Create new label"
      >
        <Plus className="size-6" />
      </NavLink>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 min-w-14 items-center justify-center rounded-full px-3',
                      isActive && 'bg-primary/10'
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}