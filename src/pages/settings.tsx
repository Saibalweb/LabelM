import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Bell,
  Database,
  Info,
  KeyRound,
  Laptop,
  LogOut,
  Palette,
  Printer,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signOut } from '@/store/slices/authSlice'
import { hasRole, initialsOf, roleLabels } from '@/lib/auth'
import { cn } from '@/lib/utils'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
      {children}
    </h3>
  )
}

function Row({
  icon,
  iconClassName,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  iconClassName?: string
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('shrink-0', iconClassName ?? 'text-on-surface-variant')}>{icon}</span>
        <div className="min-w-0">
          <p className="font-body-md text-body-md text-on-surface">{title}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function Settings() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const canManageTeam = hasRole(user?.role, 'admin')

  async function handleSignOut() {
    await dispatch(signOut())
    toast.success('Signed out')
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Settings" backTo="/" />

      <main className="flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-background">Settings</h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Account, security, preferences and data.
            </p>
          </div>

          <section className="space-y-3">
            <SectionTitle>Account</SectionTitle>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent font-headline-md text-headline-md font-bold text-on-primary-fixed">
                  {initialsOf(user?.name ?? 'User')}
                </span>
                <div className="min-w-0">
                  <p className="font-headline-md text-headline-md text-on-surface">
                    {user?.name ?? 'Unknown user'}
                  </p>
                  <p className="truncate font-label-sm text-label-sm font-mono text-on-surface-variant">
                    {user?.email ?? '—'}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                    {user ? roleLabels[user.role] : '—'}
                  </span>
                </div>
              </div>
            </div>
            <Row
              icon={<KeyRound className="size-5" />}
              title="Change password"
              description="Update the password used to sign in"
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toast.info('Password change requires Supabase (coming soon)')}
                  className="h-10 rounded-lg border-outline-variant font-label-md text-label-md"
                >
                  Change
                </Button>
              }
            />
            <Row
              icon={<LogOut className="size-5" />}
              iconClassName="text-destructive"
              title="Sign out"
              description="End your session on this device"
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                  className="h-10 rounded-lg border-destructive/30 font-label-md text-label-md text-destructive hover:bg-destructive/10"
                >
                  Sign out
                </Button>
              }
            />
          </section>

          <section className="space-y-3">
            <SectionTitle>Security</SectionTitle>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Laptop className="mt-0.5 size-5 shrink-0 text-on-surface-variant" />
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Active sessions</p>
                    <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                      This device · Current session
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-secondary-container">
                  <span className="size-1.5 rounded-full bg-secondary" />
                  Active
                </span>
              </div>
            </div>
            <Row
              icon={<ShieldCheck className="size-5" />}
              title="Sign out of all devices"
              description="Revoke every other active session"
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toast.info('Session management requires Supabase (coming soon)')}
                  className="h-10 rounded-lg border-outline-variant font-label-md text-label-md"
                >
                  Revoke
                </Button>
              }
            />
          </section>

          {canManageTeam ? (
            <section className="space-y-3">
              <SectionTitle>Workspace</SectionTitle>
              <Link
                to="/team"
                className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-4 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <Users className="size-5 text-primary" />
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Team &amp; roles</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Invite members and manage access
                    </p>
                  </div>
                </div>
                <SettingsIcon className="size-5 text-on-surface-variant" />
              </Link>
            </section>
          ) : null}

          <section className="space-y-3">
            <SectionTitle>Preferences</SectionTitle>
            <div className="space-y-3">
              <Row
                icon={<Printer className="size-5" />}
                title="Auto-mark as printed"
                description="Mark label printed on generate"
                action={
                  <Switch
                    defaultChecked={false}
                    onCheckedChange={(v) => toast.info(`Auto-print ${v ? 'enabled' : 'disabled'}`)}
                  />
                }
              />
              <Row
                icon={<Bell className="size-5" />}
                title="Notifications"
                description="Label reminders"
                action={
                  <Switch
                    defaultChecked
                    onCheckedChange={(v) => toast.info(`Notifications ${v ? 'enabled' : 'disabled'}`)}
                  />
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle>Appearance</SectionTitle>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-2 rounded-xl font-label-md text-label-md"
              onClick={() => toast.info('Theme presets coming soon')}
            >
              <Palette className="size-5 text-primary" />
              Theme
            </Button>
          </section>

          <section className="space-y-3">
            <SectionTitle>Data</SectionTitle>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-2 rounded-xl font-label-md text-label-md"
              onClick={() => toast.info('Cloud sync coming soon')}
            >
              <Database className="size-5 text-secondary" />
              Sync with cloud
            </Button>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-5 shrink-0 text-on-surface-variant" />
              <div>
                <p className="font-body-md text-body-md text-on-surface">LabelMaster Pro</p>
                <p className="mt-0.5 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                  Label &amp; bill generator for inventory and retail use. Data is stored locally on
                  this device until cloud sync is enabled.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
