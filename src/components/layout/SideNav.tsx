import { Link, NavLink } from 'react-router-dom'
import { Plus, Tag, Users, Settings, LogOut, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 font-label-md text-label-md transition-all duration-200 active:scale-95',
            isActive
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          )
        }
      >
        <Icon className="size-5" />
        {label}
      </NavLink>
    </li>
  )
}

export function SideNav() {
  return (
    <nav className="fixed top-0 left-0 z-20 hidden h-screen w-64 flex-col gap-4 border-r border-outline-variant bg-surface-container-low p-4 md:flex">
      <div className="mb-4">
        <h1 className="font-headline-md text-headline-md font-semibold tracking-tight text-primary">
          LabelMaster
        </h1>
        <p className="mt-1 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          Management Console
        </p>
      </div>

      <Link
        to="/create"
        className="flex h-[52px] min-h-[52px] w-full items-center justify-center gap-2 rounded bg-primary font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
      >
        <Plus className="size-5" />
        New Label
      </Link>

      <ul className="flex flex-1 flex-col gap-2">
        <NavItem to="/" icon={Tag} label="Labels" end />
        <NavItem to="/customers" icon={Users} label="Customers" />
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </ul>

      <div className="mt-auto border-t border-outline-variant/30 pt-4">
        <button
          type="button"
          onClick={() => toast.info('Signed out (demo)')}
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 py-3 font-label-md text-label-md text-on-surface-variant transition-all duration-200 hover:bg-error-container hover:text-on-error-container active:scale-95"
        >
          <LogOut className="size-5" />
          Logout
        </button>
      </div>
    </nav>
  )
}