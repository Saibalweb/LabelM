import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { Team } from '@/pages/team'
import authReducer from '@/store/slices/authSlice'
import type { Role } from '@/lib/types'
import type { TeamMember } from '@/services/team'

const service = vi.hoisted(() => ({
  list: vi.fn(),
  invite: vi.fn(),
  revokeInvite: vi.fn(),
  setStatus: vi.fn(),
  setRole: vi.fn(),
}))

vi.mock('@/services/team', () => ({ teamService: service }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const ownerMember: TeamMember = {
  id: 'u-owner',
  name: 'Olivia Owner',
  email: 'owner@labelm.test',
  role: 'owner',
  status: 'active',
  lastActive: '1h ago',
}

const adminMember: TeamMember = {
  id: 'u-admin',
  name: 'Aaron Admin',
  email: 'admin@labelm.test',
  role: 'admin',
  status: 'active',
  lastActive: '2h ago',
}

const otherAdmin: TeamMember = {
  id: 'u-admin-2',
  name: 'Bella Admin',
  email: 'admin2@labelm.test',
  role: 'admin',
  status: 'active',
  lastActive: '3h ago',
}

const staffMember: TeamMember = {
  id: 'u-staff',
  name: 'Sam Staff',
  email: 'staff@labelm.test',
  role: 'staff',
  status: 'active',
  lastActive: '4h ago',
}

function renderTeam({
  role,
  members,
  userId = 'u-me',
  name = 'Me Myself',
  email = 'me@labelm.test',
}: {
  role: Role
  members: TeamMember[]
  userId?: string
  name?: string
  email?: string
}) {
  service.list.mockResolvedValue(members)
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        session: null,
        profile: null,
        user: { id: userId, name, email, role },
        status: 'authenticated',
        error: null,
        lastEmail: null,
        bootstrapped: true,
      } as never,
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/team']}>
        <Team />
      </MemoryRouter>
    </Provider>
  )
}

function rowFor(email: string) {
  return screen.getByRole('row', { name: new RegExp(email.replace('.', '\\.')) })
}

beforeEach(() => {
  vi.clearAllMocks()
  service.setStatus.mockResolvedValue(undefined)
  service.setRole.mockResolvedValue(undefined)
  service.invite.mockResolvedValue(undefined)
  service.revokeInvite.mockResolvedValue(undefined)
})

describe('Team page — role-gated member actions', () => {
  it('hides suspend/remove for an admin acting on another admin', async () => {
    const user = userEvent.setup()
    renderTeam({ role: 'admin', members: [adminMember, otherAdmin] })

    await screen.findByText('Bella Admin')
    const row = rowFor('admin2@labelm.test')
    await user.click(within(row).getByRole('button', { name: 'Member options' }))

    expect(within(row).queryByRole('button', { name: 'Suspend member' })).not.toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Remove member' })).not.toBeInTheDocument()
    expect(within(row).getByText('Only the owner can manage admins')).toBeInTheDocument()
  })

  it('lets an admin suspend a staff member', async () => {
    const user = userEvent.setup()
    renderTeam({ role: 'admin', members: [adminMember, staffMember] })

    await screen.findByText('Sam Staff')
    const row = rowFor('staff@labelm.test')
    await user.click(within(row).getByRole('button', { name: 'Member options' }))

    expect(within(row).getByRole('button', { name: 'Suspend member' })).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Remove member' })).not.toBeInTheDocument()
    expect(within(row).queryByText('Only the owner can manage admins')).not.toBeInTheDocument()
  })

  it('lets the owner suspend/demote an admin', async () => {
    const user = userEvent.setup()
    renderTeam({ role: 'owner', members: [ownerMember, adminMember] })

    await screen.findByText('Aaron Admin')
    const row = rowFor('admin@labelm.test')
    await user.click(within(row).getByRole('button', { name: 'Member options' }))

    expect(within(row).getByRole('button', { name: 'Demote to staff' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Suspend member' })).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Remove member' })).not.toBeInTheDocument()
  })

  it('never offers a hard-delete (Remove member) to owner or admin', async () => {
    const user = userEvent.setup()
    renderTeam({ role: 'owner', members: [ownerMember, adminMember, staffMember] })

    await screen.findByText('Sam Staff')
    for (const email of ['admin@labelm.test', 'staff@labelm.test']) {
      const row = rowFor(email)
      await user.click(within(row).getByRole('button', { name: 'Member options' }))
      expect(within(row).queryByRole('button', { name: 'Remove member' })).not.toBeInTheDocument()
    }
  })

  it('does not offer ownership transfer to a non-owner', async () => {
    const user = userEvent.setup()
    renderTeam({ role: 'admin', members: [ownerMember, adminMember] })

    await screen.findByText('Olivia Owner')
    const row = rowFor('owner@labelm.test')
    await user.click(within(row).getByRole('button', { name: 'Member options' }))

    expect(within(row).getByText('Owner cannot be removed')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Transfer ownership' })).not.toBeInTheDocument()
  })
})

describe('Team page — in-flight action feedback', () => {
  it('disables the row trigger and blocks a duplicate request while pending', async () => {
    const user = userEvent.setup()
    let resolveStatus!: () => void
    service.setStatus.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStatus = () => resolve()
        })
    )

    renderTeam({ role: 'admin', members: [adminMember, staffMember] })
    await screen.findByText('Sam Staff')

    const row = rowFor('staff@labelm.test')
    await user.click(within(row).getByRole('button', { name: 'Member options' }))
    await user.click(within(row).getByRole('button', { name: 'Suspend member' }))

    expect(service.setStatus).toHaveBeenCalledWith('u-staff', 'suspended')

    await waitFor(() =>
      expect(within(row).getByRole('button', { name: 'Member options' })).toBeDisabled()
    )

    // The disabled trigger cannot fire a second request.
    await user.click(within(row).getByRole('button', { name: 'Member options' }))
    expect(service.setStatus).toHaveBeenCalledTimes(1)

    resolveStatus()
    await waitFor(() =>
      expect(within(row).getByRole('button', { name: 'Member options' })).toBeEnabled()
    )
  })
})

describe('Team page — current user emphasis', () => {
  it('pins and highlights the signed-in user at the top of the list', async () => {
    renderTeam({
      role: 'staff',
      members: [ownerMember, adminMember, staffMember],
      userId: 'u-staff',
      name: 'Sam Staff',
      email: 'staff@labelm.test',
    })

    await screen.findByText('Sam Staff')

    const rows = screen.getAllByRole('row')
    const firstBodyRow = rows[1]
    expect(within(firstBodyRow).getByText('staff@labelm.test')).toBeInTheDocument()
    expect(within(firstBodyRow).getByText('You')).toBeInTheDocument()
  })
})
