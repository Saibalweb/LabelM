import type { Role } from '@/lib/types'

export const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

const roleRank: Record<Role, number> = {
  owner: 3,
  admin: 2,
  staff: 1,
}

export function hasRole(role: Role | undefined, min: Role): boolean {
  if (!role) return false
  return roleRank[role] >= roleRank[min]
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}