import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  DEMO_PASSWORD,
  clearSession,
  demoAccounts,
  loadSession,
  saveSession,
  type AuthUser,
} from '@/lib/auth'

interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'error'
  error: string | null
  bootstrapped: boolean
  lastEmail: string | null
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  bootstrapped: false,
  lastEmail: null,
}

function delay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type SignInReject = { code: 'restricted' | 'invalid'; message: string }

export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  await delay(150)
  return loadSession()
})

export const signInWithPassword = createAsyncThunk<
  AuthUser,
  { email: string; password: string },
  { rejectValue: SignInReject }
>('auth/signInWithPassword', async ({ email, password }, { rejectWithValue }) => {
  await delay()
  const key = email.trim().toLowerCase()
  const account = demoAccounts[key]
  if (!account) {
    return rejectWithValue({
      code: 'restricted',
      message: 'This account is not authorized for this workspace.',
    })
  }
  if (password !== DEMO_PASSWORD) {
    return rejectWithValue({ code: 'invalid', message: 'Incorrect email or password.' })
  }
  saveSession(account)
  return account
})

export const requestMagicLink = createAsyncThunk(
  'auth/requestMagicLink',
  async ({ email }: { email: string }) => {
    await delay()
    return email.trim()
  }
)

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email }: { email: string }) => {
    await delay()
    return email.trim()
  }
)

export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async ({ password }: { password: string; email?: string }) => {
    await delay()
    return password
  }
)

export const acceptInvite = createAsyncThunk(
  'auth/acceptInvite',
  async ({ name, email }: { name: string; email: string; password: string }) => {
    await delay()
    const user: AuthUser = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: 'staff',
    }
    saveSession(user)
    return user
  }
)

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await delay(200)
  clearSession()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    clearAuth(state) {
      state.user = null
      state.status = 'idle'
      state.error = null
      state.lastEmail = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.bootstrapped = true
        state.user = action.payload
        state.status = action.payload ? 'authenticated' : 'idle'
      })
      .addCase(restoreSession.rejected, (state) => {
        state.bootstrapped = true
        state.status = 'idle'
      })
      .addCase(signInWithPassword.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(signInWithPassword.fulfilled, (state, action) => {
        state.status = 'authenticated'
        state.user = action.payload
        state.error = null
      })
      .addCase(signInWithPassword.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload?.message ?? 'Unable to sign in.'
      })
      .addCase(requestMagicLink.fulfilled, (state, action) => {
        state.lastEmail = action.payload
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.lastEmail = action.payload
      })
      .addCase(acceptInvite.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(acceptInvite.fulfilled, (state, action) => {
        state.status = 'authenticated'
        state.user = action.payload
        state.error = null
      })
      .addCase(acceptInvite.rejected, (state) => {
        state.status = 'error'
        state.error = 'Unable to accept the invitation.'
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null
        state.status = 'idle'
        state.error = null
        state.lastEmail = null
      })
  },
})

export const { clearAuthError, clearAuth } = authSlice.actions
export default authSlice.reducer
