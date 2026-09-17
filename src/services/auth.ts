import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/types'

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

  async acceptInvite(_input: { name: string; email: string; password: string }) {
    throw new Error('Invitations are not available yet. Ask an admin for access.')
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