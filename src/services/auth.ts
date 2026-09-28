import { supabase } from '@/lib/supabase'
import type { Employee, Role } from '@/lib/types'

const FALLBACK = 'Something went wrong. Please try again.'

function redirectUrl(path = '/'): string {
  return `${window.location.origin}${path}`
}

export const authService = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message || FALLBACK
      )
    }
    return data
  },

  async requestMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl('/') },
    })
    if (error) throw new Error(error.message || FALLBACK)
  },

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl('/reset-password'),
    })
    if (error) throw new Error(error.message || FALLBACK)
  },

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message || FALLBACK)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message || FALLBACK)
  },

  async signOutAllDevices() {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) throw new Error(error.message || FALLBACK)
  },

  async inviteUser({ email, role }: { email: string; role: Role }) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role },
    })
    if (error) {
      const context = (error as { context?: { data?: { error?: string } } }).context?.data
      throw new Error(context?.error ?? error.message ?? FALLBACK)
    }
    if (!data?.ok) {
      throw new Error((data as { error?: string } | null)?.error ?? FALLBACK)
    }
    return data as { ok: true; id: string }
  },

  async acceptInvite({
    tokenHash,
    name,
    password,
  }: {
    tokenHash: string
    name: string
    password: string
  }): Promise<Employee> {
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'invite',
    })
    if (verifyErr) {
      throw new Error(
        verifyErr.message.toLowerCase().includes('expired')
          ? 'This invitation link has expired. Ask your admin to resend it.'
          : verifyErr.message || FALLBACK
      )
    }

    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) throw new Error(pwErr.message || FALLBACK)

    const { data: employee, error: rpcErr } = await supabase.rpc('activate_my_membership', {
      new_full_name: name,
    })
    if (rpcErr) throw new Error(rpcErr.message || FALLBACK)

    return employee as Employee
  },

  async getProfile(userId: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message || FALLBACK)
    return (data as Employee | null) ?? null
  },
}