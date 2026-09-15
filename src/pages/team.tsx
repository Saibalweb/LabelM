import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Hourglass,
  Lock,
  Mail,
  MoreVertical,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TextField } from '@/components/auth/TextField'
import { useAppSelector } from '@/store/hooks'
import { initialsOf, roleLabels, type MemberStatus, type Role } from '@/lib/auth'
import { demoMembers, type TeamMember } from '@/lib/demo/team'
import { cn } from '@/lib/utils'

const avatarStyles = [
  'bg-accent text-on-primary-fixed',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-surface-container-highest text-on-surface',
  'bg-primary-container text-on-primary-container',
]

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full font-label-md text-label-md font-bold',
        avatarStyles[index % avatarStyles.length]
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    owner: 'bg-inverse-surface text-inverse-on-surface',
    admin: 'bg-primary-container text-on-primary-container',
    staff: 'bg-surface-container-high text-on-surface-variant',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-label-sm text-label-sm font-semibold',
        styles[role]
      )}
    >
      {role === 'owner' ? <BadgeCheck className="size-3.5" /> : null}
      {role === 'admin' ? <ShieldCheck className="size-3.5" /> : null}
      {roleLabels[role]}
    </span>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-secondary-container">
        <span className="size-1.5 rounded-full bg-secondary" />
        Active
      </span>
    )
  }
  if (status === 'invited') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-container/50 px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-tertiary-container">
        <span className="size-1.5 rounded-full bg-tertiary" />
        Invited
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm font-medium text-outline">
      <Lock className="size-3.5" />
      Suspended
    </span>
  )
}

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canInviteAdmin: boolean
  onInvite: (member: TeamMember) => void
}

function InviteMemberDialog({ open, onOpenChange, canInviteAdmin, onInvite }: InviteDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('staff')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    const name = email
      .split('@')[0]
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
    onInvite({
      id: `m-${Date.now()}`,
      name,
      email: email.trim(),
      role,
      status: 'invited',
      lastActive: 'Pending join',
    })
    toast.success(`Invitation sent to ${email}`)
    setEmail('')
    setRole('staff')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-0 sm:max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 border-b border-outline-variant p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <UserPlus className="size-5" />
          </span>
          <div>
            <DialogTitle className="font-headline-md text-headline-md text-on-surface">
              Invite new member
            </DialogTitle>
            <DialogDescription className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Send an activation invitation to join this workspace.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          <TextField
            id="invite-email"
            label="Work email address"
            type="email"
            required
            placeholder="colleague@company.com"
            icon={<Mail className="size-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-1.5">
            <label
              htmlFor="invite-role"
              className="block font-label-md text-label-md text-on-surface"
            >
              Workspace role
            </label>
            <div className="relative">
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-transparent bg-surface-container-low px-3.5 pr-10 font-body-md text-body-md text-on-surface focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="staff">Staff — generate &amp; print labels, view customers</option>
                {canInviteAdmin ? (
                  <option value="admin">Admin — full configuration &amp; team access</option>
                ) : null}
              </select>
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-outline">
                <ChevronRight className="size-4 rotate-90" />
              </span>
            </div>
            {!canInviteAdmin ? (
              <p className="font-label-sm text-label-sm text-outline">
                Only the workspace owner can grant the Admin role.
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3.5">
            <Send className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              The invited user receives a secure email link valid for 7 days to complete
              onboarding.
            </p>
          </div>

          <DialogFooter className="mx-0 mb-0 flex-col-reverse gap-2 rounded-none border-0 bg-transparent p-0 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl px-5 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-primary px-6 font-body-md text-body-md font-semibold text-on-primary hover:bg-primary-container"
            >
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({
  label,
  value,
  icon,
  iconClassName,
  footnote,
}: {
  label: string
  value: number
  icon: React.ReactNode
  iconClassName: string
  footnote: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
            {label}
          </span>
          <p className="mt-1 font-headline-lg text-headline-lg font-bold text-on-surface">{value}</p>
        </div>
        <span className={cn('flex size-11 items-center justify-center rounded-xl', iconClassName)}>
          {icon}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-outline-variant/60 pt-3">
        {footnote}
      </div>
    </div>
  )
}

export function Team() {
  const currentUser = useAppSelector((state) => state.auth.user)
  const [members, setMembers] = useState<TeamMember[]>(demoMembers)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const canInviteAdmin = currentUser?.role === 'owner'

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      const matchesQuery = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'all' || m.role === roleFilter
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      return matchesQuery && matchesRole && matchesStatus
    })
  }, [members, query, roleFilter, statusFilter])

  const stats = useMemo(
    () => ({
      total: members.length,
      admins: members.filter((m) => m.role === 'admin' || m.role === 'owner').length,
      staff: members.filter((m) => m.role === 'staff').length,
      pending: members.filter((m) => m.status === 'invited').length,
    }),
    [members]
  )

  function updateStatus(id: string, status: MemberStatus) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))
    setOpenMenu(null)
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setOpenMenu(null)
    toast.success('Member removed')
  }

  return (
    <div className="flex h-full flex-col">
      <TopNav title="Team" />

      <main className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                <span>Workspace</span>
                <ChevronRight className="size-3.5" />
                <span className="font-semibold text-primary">Team Management</span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="font-headline-lg text-headline-lg text-on-background">Team</h2>
                <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                  {stats.total} members
                </span>
              </div>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Manage who can access and configure LabelMaster Pro operations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.info('Export started (demo)')}
                className="h-12 gap-2 rounded-xl border-outline-variant bg-surface-container-low px-4 font-label-md text-label-md text-on-surface hover:bg-surface-container"
              >
                <Download className="size-[18px]" />
                Export CSV
              </Button>
              <Button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="h-12 gap-2 rounded-xl bg-primary px-5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container"
              >
                <UserPlus className="size-[18px]" />
                Invite member
              </Button>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Members"
              value={stats.total}
              icon={<Users className="size-6" />}
              iconClassName="bg-accent text-primary"
              footnote={
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Across 3 operational roles
                </span>
              }
            />
            <StatCard
              label="Admins"
              value={stats.admins}
              icon={<ShieldCheck className="size-6" />}
              iconClassName="bg-surface-container text-on-surface"
              footnote={
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Full configuration access
                </span>
              }
            />
            <StatCard
              label="Staff"
              value={stats.staff}
              icon={<BadgeCheck className="size-6" />}
              iconClassName="bg-secondary-container/50 text-secondary"
              footnote={
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Labeling &amp; customer access
                </span>
              }
            />
            <StatCard
              label="Pending Invites"
              value={stats.pending}
              icon={<Hourglass className="size-6" />}
              iconClassName="bg-tertiary-container/50 text-tertiary"
              footnote={
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Awaiting email acceptance
                </span>
              }
            />
          </div>

          <div className="rounded-t-xl border border-b-0 border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-lg">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline">
                  <Search className="size-5" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members by name or email..."
                  className="h-11 w-full rounded-lg border border-transparent bg-surface-container-low pr-4 pl-10 font-body-md text-body-md text-on-surface transition focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-11 cursor-pointer rounded-lg border border-transparent bg-surface-container-low px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">All roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 cursor-pointer rounded-lg border border-transparent bg-surface-container-low px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="suspended">Suspended</option>
                </select>
                <span className="rounded-lg bg-surface-container px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">
                  Showing <strong className="text-on-surface">{filtered.length}</strong> of{' '}
                  {members.length}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low/70 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                  <th className="px-6 py-3.5 font-semibold">Member</th>
                  <th className="px-6 py-3.5 font-semibold">Role</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Last Active</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filtered.map((member, index) => (
                  <tr key={member.id} className="group transition-colors hover:bg-surface-container-low/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <Avatar name={member.name} index={index} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-body-md text-body-md font-semibold text-on-surface">
                              {member.name}
                            </span>
                            {member.role === 'owner' ? (
                              <BadgeCheck className="size-4 text-primary" />
                            ) : null}
                          </div>
                          <span className="truncate font-label-sm text-label-sm font-mono text-on-surface-variant">
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-label-sm text-label-sm text-on-surface">
                        {member.lastActive}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          aria-label="Member options"
                          onClick={() =>
                            setOpenMenu((prev) => (prev === member.id ? null : member.id))
                          }
                          className="flex size-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
                        >
                          <MoreVertical className="size-5" />
                        </button>
                        {openMenu === member.id ? (
                          <div
                            ref={menuRef}
                            className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest py-1.5 shadow-xl"
                          >
                            {member.role === 'owner' ? (
                              <>
                                <div className="mx-1.5 mb-1 flex items-center gap-2 rounded-lg bg-surface-container-low/60 px-3.5 py-2">
                                  <Lock className="size-4 text-outline" />
                                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                                    Owner cannot be removed
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(null)
                                    toast.info('Ownership transfer requires confirmation')
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                                >
                                  <RefreshCw className="size-4" />
                                  Transfer ownership
                                </button>
                              </>
                            ) : null}

                            {member.status === 'invited' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(null)
                                    toast.success(`Invite resent to ${member.email}`)
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                                >
                                  <Send className="size-4" />
                                  Resend invite
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMember(member.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                  Revoke invite
                                </button>
                              </>
                            ) : null}

                            {member.status === 'active' && member.role !== 'owner' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(member.id, 'suspended')}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                                >
                                  <Pause className="size-4" />
                                  Suspend member
                                </button>
                                <div className="my-1 h-px bg-surface-container-high" />
                                <button
                                  type="button"
                                  onClick={() => removeMember(member.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                  Remove member
                                </button>
                              </>
                            ) : null}

                            {member.status === 'suspended' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(member.id, 'active')}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-secondary hover:bg-surface-container-low"
                                >
                                  <Play className="size-4" />
                                  Reactivate member
                                </button>
                                <div className="my-1 h-px bg-surface-container-high" />
                                <button
                                  type="button"
                                  onClick={() => removeMember(member.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                  Remove member
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center font-body-md text-body-md text-on-surface-variant"
                    >
                      No members match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Showing <span className="font-semibold text-on-surface">{filtered.length}</span> of{' '}
              {members.length} members
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                disabled
                className="h-10 gap-1 rounded-lg border-outline-variant bg-surface-container-lowest px-3.5 font-body-md text-body-md text-on-surface-variant"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-1 rounded-lg border-outline-variant bg-surface-container-lowest px-3.5 font-body-md text-body-md text-on-surface hover:bg-surface-container"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="h-16 md:h-8" />
        </div>
      </main>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        canInviteAdmin={canInviteAdmin}
        onInvite={(member) => setMembers((prev) => [member, ...prev])}
      />
    </div>
  )
}
