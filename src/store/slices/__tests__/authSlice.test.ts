import { describe, expect, it } from 'vitest'
import reducer, {
  bootstrapStart,
  clearAuth,
  clearAuthError,
  setAuth,
  setLastEmail,
  setProfile,
} from '@/store/slices/authSlice'
import type { Employee } from '@/lib/types'

function profile(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'user-1',
    email: 'owner@company.com',
    full_name: 'Saibal Kole',
    role: 'owner',
    status: 'active',
    avatar: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const session = { access_token: 'tok' } as unknown as NonNullable<
  Parameters<typeof setAuth>[0]['session']
>

describe('authSlice initialState', () => {
  it('starts idle and unauthenticated', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      session: null,
      profile: null,
      user: null,
      status: 'idle',
      error: null,
      lastEmail: null,
      bootstrapped: false,
    })
  })
})

describe('bootstrapStart', () => {
  it('flips to loading and clears bootstrapped', () => {
    const next = reducer({ ...(reducer(undefined, { type: 'x' })), bootstrapped: true }, bootstrapStart())
    expect(next.status).toBe('loading')
    expect(next.bootstrapped).toBe(false)
  })
})

describe('setAuth', () => {
  it('marks authenticated with a mapped user for an active profile', () => {
    const state = reducer(
      undefined,
      setAuth({ session: session as never, profile: profile() })
    )
    expect(state.bootstrapped).toBe(true)
    expect(state.status).toBe('authenticated')
    expect(state.session).toEqual(session)
    expect(state.user).toEqual({
      id: 'user-1',
      name: 'Saibal Kole',
      email: 'owner@company.com',
      role: 'owner',
    })
    expect(state.error).toBeNull()
  })

  it('marks restricted for a suspended profile', () => {
    const state = reducer(
      undefined,
      setAuth({ session: session as never, profile: profile({ status: 'suspended' }) })
    )
    expect(state.status).toBe('restricted')
    expect(state.user?.role).toBe('owner')
  })

  it('marks restricted for an invited profile', () => {
    const state = reducer(
      undefined,
      setAuth({ session: session as never, profile: profile({ status: 'invited' }) })
    )
    expect(state.status).toBe('restricted')
  })

  it('keeps status idle when the profile is missing', () => {
    const state = reducer(undefined, setAuth({ session: session as never, profile: null }))
    expect(state.status).toBe('idle')
    expect(state.user).toBeNull()
    expect(state.bootstrapped).toBe(true)
  })
})

describe('setProfile', () => {
  it('updates user + status from a new profile without touching session', () => {
    const state = reducer(
      reducer(undefined, setAuth({ session: session as never, profile: profile() })),
      setProfile(profile({ full_name: 'Riya Sharma', role: 'staff' }))
    )
    expect(state.user?.name).toBe('Riya Sharma')
    expect(state.user?.role).toBe('staff')
    expect(state.status).toBe('authenticated')
    expect(state.session).toEqual(session)
  })

  it('degrades to restricted when the profile becomes suspended', () => {
    const state = reducer(
      reducer(undefined, setAuth({ session: session as never, profile: profile() })),
      setProfile(profile({ status: 'suspended' }))
    )
    expect(state.status).toBe('restricted')
  })
})

describe('clearAuth', () => {
  it('resets the session/user but stays bootstrapped', () => {
    const state = reducer(
      reducer(
        undefined,
        setAuth({ session: session as never, profile: profile() })
      ),
      clearAuth()
    )
    expect(state.session).toBeNull()
    expect(state.profile).toBeNull()
    expect(state.user).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.bootstrapped).toBe(true)
    expect(state.error).toBeNull()
    expect(state.lastEmail).toBeNull()
  })
})

describe('clearAuthError / setLastEmail', () => {
  it('clears the error field', () => {
    const state = reducer(
      { ...(reducer(undefined, { type: 'x' })), error: 'boom' },
      clearAuthError()
    )
    expect(state.error).toBeNull()
  })

  it('remembers the last attempted email', () => {
    const state = reducer(undefined, setLastEmail('a@b.com'))
    expect(state.lastEmail).toBe('a@b.com')
  })
})