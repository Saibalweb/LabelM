import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Landmark,
  Plus,
  ReceiptText,
  Tag,
  Users,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signOut } from '@/store/slices/authSlice'
import { hasRole } from '@/lib/auth'
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
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const role = useAppSelector((state) => state.auth.user?.role)
  const canManageTeam = hasRole(role, 'admin')

  async function handleSignOut() {
    await dispatch(signOut())
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <nav className="fixed top-0 left-0 z-20 hidden h-screen w-64 flex-col gap-4 border-r border-outline-variant bg-surface-container-low p-4 md:flex">
      <div className="mb-4">
        <h1 className="font-headline-md text-headline-md font-semibold tracking-tight text-primary">
          LabelMaster
        </h1>
        <p className="mt-1 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
          Management Console
        </p>
      </div>

      <Button
        asChild
        className="h-[52px] min-h-[52px] w-full gap-2 rounded font-label-md text-label-md text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container"
      >
        <Link to="/create">
          <Plus className="size-5" />
          New Label
        </Link>
      </Button>

      <ul className="flex flex-1 flex-col gap-2">
        <NavItem to="/" icon={Tag} label="Labels" end />
        <NavItem to="/invoice" icon={ReceiptText} label="Invoices" />
        <NavItem to="/dues" icon={Landmark} label="Dues" />
        <NavItem to="/customers" icon={Users} label="Customers" />
        {canManageTeam ? <NavItem to="/team" icon={BadgeCheck} label="Team" /> : null}
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </ul>

      <div className="mt-auto border-t border-outline-variant/30 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleSignOut}
          className="flex min-h-[48px] w-full items-center justify-start gap-3 rounded-xl px-4 py-3 font-label-md text-label-md text-on-surface-variant hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <LogOut className="size-5" />
          Logout
        </Button>
      </div>
    </nav>
  )
}
