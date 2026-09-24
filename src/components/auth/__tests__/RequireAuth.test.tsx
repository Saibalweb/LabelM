import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RequireAuth, RequireRole } from '@/components/auth/RequireAuth'
import authReducer from '@/store/slices/authSlice'
import draftReducer, { emptyDraft } from '@/store/slices/draftSlice'
import type { Role } from '@/lib/types'

function makeUser(role: Role) {
  return { id: 'u1', name: 'Saibal Kole', email: 's@c.com', role }
}

function makeStore(status: string, user: ReturnType<typeof makeUser> | null, bootstrapped: boolean) {
  return configureStore({
    reducer: { auth: authReducer, draft: draftReducer },
    preloadedState: {
      auth: {
        session: null,
        profile: null,
        user,
        status,
        error: null,
        lastEmail: null,
        bootstrapped,
      } as never,
      draft: { draft: emptyDraft },
    },
  })
}

function FromStateProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return <div>{from ? `from:${from}` : 'from:none'}</div>
}

function renderProtected(
  status: string,
  user: ReturnType<typeof makeUser> | null,
  bootstrapped: boolean,
  extraRoutes: React.ReactNode = null
) {
  const store = makeStore(status, user, bootstrapped)
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Dashboard content</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<FromStateProbe />} />
          <Route path="/unauthorized" element={<div>Access restricted</div>} />
          {extraRoutes}
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

describe('RequireAuth', () => {
  it('shows the full-screen loader while bootstrapping', () => {
    renderProtected('loading', null, false)
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument()
  })

  it('shows the loader when bootstrapped is false even with a session', () => {
    renderProtected('authenticated', makeUser('owner'), false)
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument()
  })

  it('renders children for an authenticated active user', () => {
    renderProtected('authenticated', makeUser('owner'), true)
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('redirects a logged-out visitor to /login preserving the from path', () => {
    renderProtected('idle', null, true)
    expect(screen.getByText('from:/dashboard')).toBeInTheDocument()
  })

  it('redirects a suspended member to /unauthorized', () => {
    renderProtected('restricted', makeUser('staff'), true)
    expect(screen.getByText('Access restricted')).toBeInTheDocument()
  })
})

function renderRole(role: Role, required: Role) {
  const store = makeStore('authenticated', makeUser(role), true)
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <RequireRole role={required}>
                <div>Admin area</div>
              </RequireRole>
            }
          />
          <Route path="/unauthorized" element={<div>Access restricted</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

describe('RequireRole', () => {
  it('lets an owner into an admin-only area', () => {
    renderRole('owner', 'admin')
    expect(screen.getByText('Admin area')).toBeInTheDocument()
  })

  it('lets an admin into an admin-only area', () => {
    renderRole('admin', 'admin')
    expect(screen.getByText('Admin area')).toBeInTheDocument()
  })

  it('blocks staff from an admin-only area', () => {
    renderRole('staff', 'admin')
    expect(screen.getByText('Access restricted')).toBeInTheDocument()
  })

  it('blocks everyone but owners from owner-only areas', () => {
    renderRole('owner', 'owner')
    expect(screen.getByText('Admin area')).toBeInTheDocument()
  })

  it('redirects an admin from an owner-only area', () => {
    renderRole('admin', 'owner')
    expect(screen.getByText('Access restricted')).toBeInTheDocument()
  })
})