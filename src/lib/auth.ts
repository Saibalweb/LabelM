export type Role = 'owner' | 'admin' | 'staff'
export type MemberStatus = 'active' | 'invited' | 'suspended'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export const DEMO_PASSWORD = 'labelmaster'

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

export const demoAccounts: Record<string, AuthUser> = {
  'owner@labelmaster.test': {
    id: 'u-owner',
    name: 'Sarah Jenkins',
    email: 'owner@labelmaster.test',
    role: 'owner',
  },
  'admin@labelmaster.test': {
    id: 'u-admin',
    name: 'David Miller',
    email: 'admin@labelmaster.test',
    role: 'admin',
  },
  'staff@labelmaster.test': {
    id: 'u-staff',
    name: 'Marcus Vance',
    email: 'staff@labelmaster.test',
    role: 'staff',
  },
}

const SESSION_KEY = 'labelm.session'

export function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function saveSession(user: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
