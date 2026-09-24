import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ComingSoon } from '@/components/ui/coming-soon'

function renderComingSoon(initial = '/team') {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/team"
          element={<ComingSoon title="Team management" description="Inviting teammates is coming." />}
        />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ComingSoon', () => {
  it('shows the title, description and final-delivery badge', () => {
    renderComingSoon()
    expect(screen.getByRole('heading', { name: 'Team management' })).toBeInTheDocument()
    expect(screen.getByText('Inviting teammates is coming.')).toBeInTheDocument()
    expect(screen.getByText('Available in the final delivery')).toBeInTheDocument()
  })

  it('navigates back to the dashboard', async () => {
    const user = userEvent.setup()
    renderComingSoon()
    await user.click(screen.getByRole('button', { name: 'Back to dashboard' }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})