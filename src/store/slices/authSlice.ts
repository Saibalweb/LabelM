import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Session } from '@supabase/supabase-js'
import type { AuthUser, Employee } from '@/lib/types'

interface AuthState {
  session: Session | null
  profile: Employee | null
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'restricted'
  error: string | null
  lastEmail: string | null
  bootstrapped: boolean
}

const initialState: AuthState = {
  session: null,
  profile: null,
  user: null,
  status: 'idle',
  error: null,
  lastEmail: null,
  bootstrapped: false,
}

function toUser(profile: Employee | null): AuthUser | null {
  if (!profile) return null
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
  }
}

function statusOf(profile: Employee | null): AuthState['status'] {
  if (!profile) return 'idle'
  return profile.status === 'active' ? 'authenticated' : 'restricted'
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    bootstrapStart(state) {
      state.bootstrapped = false
      state.status = 'loading'
    },
    setAuth(
      state,
      action: PayloadAction<{ session: Session | null; profile: Employee | null }>
    ) {
      state.bootstrapped = true
      state.session = action.payload.session
      state.profile = action.payload.profile
      state.user = toUser(action.payload.profile)
      state.status = statusOf(action.payload.profile)
      state.error = null
    },
    setProfile(state, action: PayloadAction<Employee | null>) {
      state.profile = action.payload
      state.user = toUser(action.payload)
      state.status = statusOf(action.payload)
    },
    clearAuth(state) {
      state.session = null
      state.profile = null
      state.user = null
      state.status = 'idle'
      state.error = null
      state.lastEmail = null
      state.bootstrapped = true
    },
    clearAuthError(state) {
      state.error = null
    },
    setLastEmail(state, action: PayloadAction<string>) {
      state.lastEmail = action.payload
    },
  },
})

export const { bootstrapStart, setAuth, setProfile, clearAuth, clearAuthError, setLastEmail } =
  authSlice.actions
export default authSlice.reducer