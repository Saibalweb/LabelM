import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth'
import type { Employee, MemberStatus, Role } from '@/lib/types'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: Role
  status: MemberStatus
  lastActive: string
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function toTeamMember(employee: Employee): TeamMember {
  return {
    id: employee.id,
    name: employee.full_name,
    email: employee.email,
    role: employee.role,
    status: employee.status,
    lastActive: employee.status === 'invited' ? 'Pending join' : timeAgo(employee.updated_at),
  }
}

export const teamService = {
  async list(): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Employee[]).map(toTeamMember)
  },

  async invite(input: { email: string; role: Role }) {
    return authService.inviteUser(input)
  },

  async revokeInvite(id: string) {
    const { data, error } = await supabase.functions.invoke('revoke-user', {
      body: { memberId: id },
    })
    if (error) {
      const context = (error as { context?: { data?: { error?: string } } }).context?.data
      throw new Error(context?.error ?? error.message ?? 'Unable to revoke the invitation')
    }
    if (!data?.ok) {
      throw new Error((data as { error?: string } | null)?.error ?? 'Unable to revoke the invitation')
    }
  },

  async setStatus(id: string, status: Exclude<MemberStatus, 'invited'>) {
    const { error } = await supabase.rpc('admin_update_member_status', {
      member_id: id,
      new_status: status,
    })
    if (error) throw new Error(error.message)
  },

  async setRole(id: string, role: Role) {
    const { error } = await supabase.rpc('owner_update_member_role', {
      member_id: id,
      new_role: role,
    })
    if (error) throw new Error(error.message)
  },

  async purge(id: string) {
    const { error } = await supabase.rpc('owner_purge_member', { member_id: id })
    if (error) throw new Error(error.message)
  },
}