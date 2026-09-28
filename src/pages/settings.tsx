import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Info,
  KeyRound,
  Laptop,
  LogOut,
  MonitorSmartphone,
  Palette,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CompanyDetailsSection } from '@/components/settings/CompanyDetailsSection'
import { LabelPrintingSection } from '@/components/settings/LabelPrintingSection'
import { SectionHeader } from '@/components/settings/SectionHeader'
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog'
import { useAppSelector } from '@/store/hooks'
import { hasRole, initialsOf, roleLabels } from '@/lib/roles'
import { authService } from '@/services/auth'
import { cn } from '@/lib/utils'

function Row({
  icon,
  tone = 'default',
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  tone?: 'default' | 'danger'
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            tone === 'danger'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-surface-container-high text-on-surface-variant'
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-body-md text-body-md font-medium text-on-surface">{title}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

const outlineAction =
  'h-10 rounded-lg border-outline-variant font-label-md text-label-md'
const dangerAction =
  'h-10 rounded-lg border-destructive/30 font-label-md text-label-md text-destructive hover:bg-destructive/10'

export function Settings() {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const canManageTeam = hasRole(user?.role, 'admin')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signOutAllOpen, setSignOutAllOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await authService.signOut()
      toast.success('Signed out of this device')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to sign out.')
    } finally {
      setSigningOut(false)
      setSignOutOpen(false)
    }
  }

  async function handleSignOutAllDevices() {
    setSigningOut(true)
    try {
      await authService.signOutAllDevices()
      toast.success('Signed out of all devices')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to sign out of all devices.')
    } finally {
      setSigningOut(false)
      setSignOutAllOpen(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Settings" backTo="/" />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-10 pb-10">
          <header>
            <p className="font-label-sm text-label-sm font-semibold tracking-wider text-primary uppercase">
              Account &amp; workspace
            </p>
            <h1 className="mt-1 font-headline-lg text-headline-lg text-on-background">Settings</h1>
            <p className="mt-1 max-w-xl font-body-md text-body-md text-on-surface-variant">
              Manage your profile, sign-in security, workspace branding and print defaults.
            </p>
          </header>

          {!canManageTeam ? (
            <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-on-surface-variant" />
              <p className="font-body-md text-body-md text-on-surface-variant">
                You have <span className="font-semibold text-on-surface">view-only</span> access.
                Company details and print settings can only be changed by an owner or admin.
              </p>
            </div>
          ) : null}

          <section className="space-y-4">
            <SectionHeader
              icon={<UserCog className="size-5" />}
              title="Account"
              description="Your profile and sign-in security."
            />

            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent font-headline-md text-headline-md font-bold text-on-primary-fixed">
                  {initialsOf(user?.name ?? 'User')}
                </span>
                <div className="min-w-0">
                  <p className="font-headline-md text-headline-md font-semibold text-on-surface">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                    <Laptop className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      Current session
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      This device · signed in as {user?.email ?? 'you'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary-container/40 px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-secondary-container">
                  <span className="size-1.5 rounded-full bg-secondary" />
                  Active
                </span>
              </div>

              <Row
                icon={<KeyRound className="size-5" />}
                title="Change password"
                description="Update the password used to sign in"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasswordOpen(true)}
                    className={outlineAction}
                  >
                    Change
                  </Button>
                }
              />
              <Row
                icon={<LogOut className="size-5" />}
                tone="danger"
                title="Sign out of this device"
                description="End your session on this device only"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignOutOpen(true)}
                    className={dangerAction}
                  >
                    Sign out
                  </Button>
                }
              />
              <Row
                icon={<MonitorSmartphone className="size-5" />}
                tone="danger"
                title="Sign out of all devices"
                description="Revoke every active session, including this one"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignOutAllOpen(true)}
                    className={dangerAction}
                  >
                    Revoke all
                  </Button>
                }
              />
            </div>
          </section>

          {canManageTeam ? (
            <section className="space-y-4">
              <SectionHeader
                icon={<Users className="size-5" />}
                title="Workspace"
                description="Team access and roles."
              />
              <Link
                to="/team"
                className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3.5 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                    <Users className="size-5" />
                  </span>
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      Team &amp; roles
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Invite members and manage access
                    </p>
                  </div>
                </div>
                <SettingsIcon className="size-5 shrink-0 text-on-surface-variant" />
              </Link>
            </section>
          ) : null}

          <CompanyDetailsSection canEdit={canManageTeam} />

          <LabelPrintingSection canEdit={canManageTeam} />

          <section className="space-y-4">
            <SectionHeader
              icon={<Palette className="size-5" />}
              title="Appearance"
              description="Theme and display preferences."
            />
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-2 rounded-xl border-outline-variant font-label-md text-label-md"
              onClick={() => toast.info('Theme presets coming soon')}
            >
              <Palette className="size-5 text-primary" />
              Theme
            </Button>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-5 shrink-0 text-on-surface-variant" />
              <div>
                <p className="font-body-md text-body-md font-semibold text-on-surface">
                  LabelMaster Pro
                </p>
                <p className="mt-0.5 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                  Label &amp; bill generator for inventory and retail use. Data is synced to your
                  workspace in the cloud.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="rounded-2xl border border-outline-variant bg-surface-container-lowest sm:max-w-md!">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline-md text-headline-md text-on-surface">
              Sign out of this device?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body-md text-body-md text-on-surface-variant">
              You will need to sign in again on this device. Other devices stay signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-2xl border-outline-variant bg-surface-container-low/50">
            <AlertDialogCancel
              disabled={signingOut}
              className="h-11 rounded-xl px-5 font-body-md text-body-md"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              onClick={handleSignOut}
              className="h-11 rounded-xl bg-destructive px-6 font-body-md text-body-md font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
        <AlertDialogContent className="rounded-2xl border border-outline-variant bg-surface-container-lowest sm:max-w-md!">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline-md text-headline-md text-on-surface">
              Sign out of all devices?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body-md text-body-md text-on-surface-variant">
              Every active session, including this one, will be revoked. You will need to sign in
              again everywhere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-2xl border-outline-variant bg-surface-container-low/50">
            <AlertDialogCancel
              disabled={signingOut}
              className="h-11 rounded-xl px-5 font-body-md text-body-md"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              onClick={handleSignOutAllDevices}
              className="h-11 rounded-xl bg-destructive px-6 font-body-md text-body-md font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut ? 'Revoking…' : 'Revoke all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
