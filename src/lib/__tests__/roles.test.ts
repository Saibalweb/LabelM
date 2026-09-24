import { describe, expect, it } from 'vitest'
import { hasRole, initialsOf, roleLabels } from '@/lib/roles'

describe('hasRole', () => {
  it('grants the owner access to every role tier', () => {
    expect(hasRole('owner', 'owner')).toBe(true)
    expect(hasRole('owner', 'admin')).toBe(true)
    expect(hasRole('owner', 'staff')).toBe(true)
  })

  it('grants admin staff and admin access but never owner', () => {
    expect(hasRole('admin', 'admin')).toBe(true)
    expect(hasRole('admin', 'staff')).toBe(true)
    expect(hasRole('admin', 'owner')).toBe(false)
  })

  it('grants staff only staff-level access', () => {
    expect(hasRole('staff', 'staff')).toBe(true)
    expect(hasRole('staff', 'admin')).toBe(false)
    expect(hasRole('staff', 'owner')).toBe(false)
  })

  it('rejects an unknown or missing role', () => {
    expect(hasRole(undefined, 'staff')).toBe(false)
  })
})

describe('initialsOf', () => {
  it('takes the first two initials, uppercased', () => {
    expect(initialsOf('Saibal Kole')).toBe('SK')
    expect(initialsOf('saibal kole')).toBe('SK')
  })

  it('returns a single initial for one-part names', () => {
    expect(initialsOf('saibal')).toBe('S')
  })

  it('returns an empty string for empty input', () => {
    expect(initialsOf('')).toBe('')
    expect(initialsOf('   ')).toBe('')
  })
})

describe('roleLabels', () => {
  it('labels every role', () => {
    expect(roleLabels.owner).toBe('Owner')
    expect(roleLabels.admin).toBe('Admin')
    expect(roleLabels.staff).toBe('Staff')
  })
})