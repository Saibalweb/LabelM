import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Login } from '@/pages/auth/login'
import { Toaster } from '@/components/ui/sonner'
import authReducer from '@/store/slices/authSlice'
import draftReducer, { emptyDraft } from '@/store/slices/draftSlice'

const authServiceMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  requestMagicLink: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
  inviteUser: vi.fn(),
  acceptInvite: vi.fn(),
  getProfile: vi.fn(),
}))
const env = vi.hoisted(() => ({ trial: true }))

vi.mock('@/services/auth', () => ({ authService: authServiceMock }))
vi.mock('@/lib/env', () => ({
  get TRIAL_MODE() {
    return env.trial
  },
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

function makeStore(status = 'idle') {
  return configureStore({
    reducer: { auth: authReducer, draft: draftReducer },
    preloadedState: {
      auth: {
        session: null,
        profile: null,
        user: null,
        status,
        error: null,
        lastEmail: null,
        bootstrapped: true,
      } as never,
      draft: { draft: emptyDraft },
    },
  })
}

function renderLogin(initialEntries: string[] = ['/login']) {
  const store = makeStore()
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/magic-link-sent" element={<div>Magic link sent page</div>} />
          <Route path="/forgot-password" element={<div>Forgot password page</div>} />
        </Routes>
      </MemoryRouter>
      <Toaster position="top-center" />
    </Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  env.trial = true
})

describe('Login in trial mode', () => {
  it('keeps the magic-link and forgot-password entry points visible', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /Email me a magic link/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument()
  })

  it('shows a coming-soon toast for the magic-link flow without calling the API', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Work email'), 'owner@company.com')
    await user.click(screen.getByRole('button', { name: /Email me a magic link/ }))

    await waitFor(() =>
      expect(screen.getByText('Magic link is available in the final delivery.')).toBeInTheDocument()
    )
    expect(authServiceMock.requestMagicLink).not.toHaveBeenCalled()
  })

  it('shows a coming-soon toast for the forgot-password flow and stays on /login', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('link', { name: 'Forgot password?' }))

    await waitFor(() =>
      expect(screen.getByText('Password reset is available in the final delivery.')).toBeInTheDocument()
    )
    expect(authServiceMock.requestPasswordReset).not.toHaveBeenCalled()
  })

  it('still performs password sign-in', async () => {
    const user = userEvent.setup()
    authServiceMock.signInWithPassword.mockResolvedValue({ user: { id: 'u1' }, session: {} })
    renderLogin()

    await user.type(screen.getByLabelText('Work email'), 'owner@company.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(authServiceMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'owner@company.com',
        password: 'secret',
      })
    )
  })

  it('shows a friendly error for wrong credentials', async () => {
    const user = userEvent.setup()
    authServiceMock.signInWithPassword.mockRejectedValue(
      new Error('Incorrect email or password.')
    )
    renderLogin()

    await user.type(screen.getByLabelText('Work email'), 'owner@company.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument()
    )
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()

    const password = screen.getByLabelText('Password', { exact: true })
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('type', 'password')
  })
})

describe('Login outside trial mode', () => {
  it('runs the real magic-link flow and navigates away', async () => {
    env.trial = false
    const user = userEvent.setup()
    authServiceMock.requestMagicLink.mockResolvedValue(undefined)
    renderLogin()

    await user.type(screen.getByLabelText('Work email'), 'owner@company.com')
    await user.click(screen.getByRole('button', { name: /Email me a magic link/ }))

    await waitFor(() => expect(authServiceMock.requestMagicLink).toHaveBeenCalledWith('owner@company.com'))
    await waitFor(() => expect(screen.getByText('Magic link sent page')).toBeInTheDocument())
  })

  it('navigates to the forgot-password page instead of a toast', async () => {
    env.trial = false
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('link', { name: 'Forgot password?' }))

    await waitFor(() => expect(screen.getByText('Forgot password page')).toBeInTheDocument())
    expect(screen.queryByText('Password reset is available in the final delivery.')).not.toBeInTheDocument()
  })
})