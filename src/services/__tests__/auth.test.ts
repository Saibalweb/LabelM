import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockSupabase } from '@/test/supabase-helpers'

const { supabaseMock } = vi.hoisted(() => {
  const supabase = {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      verifyOtp: vi.fn(),
    },
    functions: { invoke: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  } as unknown as MockSupabase
  return { supabaseMock: supabase }
})

vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock }))

import { authService } from '@/services/auth'

const ORIGIN = () => window.location.origin

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authService.signInWithPassword', () => {
  it('calls supabase auth with email + password and returns data', async () => {
    const data = { user: { id: 'u1' }, session: {} }
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ data, error: null })

    const result = await authService.signInWithPassword({
      email: 'owner@company.com',
      password: 'secret',
    })

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@company.com',
      password: 'secret',
    })
    expect(result).toEqual(data)
  })

  it('maps invalid credentials to a friendly message', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })
    await expect(
      authService.signInWithPassword({ email: 'a', password: 'b' })
    ).rejects.toThrow('Incorrect email or password.')
  })

  it('propagates other auth error messages', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' },
    })
    await expect(
      authService.signInWithPassword({ email: 'a', password: 'b' })
    ).rejects.toThrow('Email not confirmed')
  })

  it('uses a fallback message when the error is empty', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: '' },
    })
    await expect(
      authService.signInWithPassword({ email: 'a', password: 'b' })
    ).rejects.toThrow('Something went wrong. Please try again.')
  })
})

describe('authService.requestMagicLink', () => {
  it('calls signInWithOtp with a redirect to origin', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null })

    await authService.requestMagicLink('a@b.com')

    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.com',
      options: { emailRedirectTo: `${ORIGIN()}/` },
    })
  })

  it('throws the otp error', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ data: null, error: { message: 'rate limited' } })
    await expect(authService.requestMagicLink('a@b.com')).rejects.toThrow('rate limited')
  })
})

describe('authService.requestPasswordReset', () => {
  it('calls resetPasswordForEmail with a redirect to /reset-password', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    await authService.requestPasswordReset('a@b.com')

    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: `${ORIGIN()}/reset-password`,
    })
  })

  it('throws the reset error', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'nope' },
    })
    await expect(authService.requestPasswordReset('a@b.com')).rejects.toThrow('nope')
  })
})

describe('authService.updatePassword', () => {
  it('calls updateUser with the new password', async () => {
    const data = { user: { id: 'u1' } }
    supabaseMock.auth.updateUser.mockResolvedValue({ data, error: null })
    const result = await authService.updatePassword('NewPass123!')
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPass123!' })
    expect(result).toEqual(data)
  })
})

describe('authService.signOut', () => {
  it('signs out via supabase auth', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null })
    await expect(authService.signOut()).resolves.toBeUndefined()
    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
  })

  it('throws the sign-out error', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'gone' } })
    await expect(authService.signOut()).rejects.toThrow('gone')
  })
})

describe('authService.signOutAllDevices', () => {
  it('revokes every session with a global scope', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null })
    await expect(authService.signOutAllDevices()).resolves.toBeUndefined()
    expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('throws the sign-out error', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'nope' } })
    await expect(authService.signOutAllDevices()).rejects.toThrow('nope')
  })
})

describe('authService.inviteUser', () => {
  it('invokes the invite-user edge function with email + role', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({ data: { ok: true, id: 'u9' }, error: null })
    const result = await authService.inviteUser({ email: 'x@y.com', role: 'staff' })
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('invite-user', {
      body: { email: 'x@y.com', role: 'staff' },
    })
    expect(result).toEqual({ ok: true, id: 'u9' })
  })

  it('surfaces a business error from the function context', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({
      data: null,
      error: { context: { data: { error: 'Duplicate email' } } },
    })
    await expect(authService.inviteUser({ email: 'x', role: 'staff' })).rejects.toThrow(
      'Duplicate email'
    )
  })

  it('surfaces a non-ok response error', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { ok: false, error: 'Admins only' },
      error: null,
    })
    await expect(authService.inviteUser({ email: 'x', role: 'staff' })).rejects.toThrow(
      'Admins only'
    )
  })

  it('falls back when the response has no error detail', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({ data: null, error: null })
    await expect(authService.inviteUser({ email: 'x', role: 'staff' })).rejects.toThrow(
      'Something went wrong. Please try again.'
    )
  })
})

describe('authService.acceptInvite', () => {
  it('verifies the otp, sets the password and activates membership', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({ data: {}, error: null })
    supabaseMock.auth.updateUser.mockResolvedValue({ data: { user: {} }, error: null })
    supabaseMock.rpc.mockResolvedValue({ data: { id: 'u1', role: 'staff' }, error: null })

    const employee = await authService.acceptInvite({
      tokenHash: 'tok',
      name: 'New Hire',
      password: 'Pass123!',
    })

    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'tok',
      type: 'invite',
    })
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'Pass123!' })
    expect(supabaseMock.rpc).toHaveBeenCalledWith('activate_my_membership', {
      new_full_name: 'New Hire',
    })
    expect(employee).toEqual({ id: 'u1', role: 'staff' })
  })

  it('maps an expired invite error to a friendly message', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({
      data: null,
      error: { message: 'Token has expired or is invalid' },
    })
    await expect(
      authService.acceptInvite({ tokenHash: 't', name: 'N', password: 'P' })
    ).rejects.toThrow('This invitation link has expired. Ask your admin to resend it.')
  })
})

describe('authService.getProfile', () => {
  it('fetches the employee row for the user', async () => {
    const employee = { id: 'u1', email: 'a@b.c' }
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: employee, error: null })
    supabaseMock.from.mockReturnValue(chain)

    const result = await authService.getProfile('u1')

    expect(supabaseMock.from).toHaveBeenCalledWith('employees')
    expect(chain.eq).toHaveBeenCalledWith('id', 'u1')
    expect(result).toEqual(employee)
  })

  it('returns null when no profile exists', async () => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    supabaseMock.from.mockReturnValue(chain)

    expect(await authService.getProfile('missing')).toBeNull()
  })
})