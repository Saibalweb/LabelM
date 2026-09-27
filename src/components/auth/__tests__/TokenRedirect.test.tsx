import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { TokenRedirect } from '@/components/auth/TokenRedirect'

function LocationProbe({ label }: { label: string }) {
  const location = useLocation()
  return <div>{`${label}:${location.pathname}${location.search}${location.hash}`}</div>
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TokenRedirect />
      <Routes>
        <Route path="/" element={<LocationProbe label="home" />} />
        <Route path="/accept-invite" element={<LocationProbe label="accept" />} />
        <Route path="/reset-password" element={<LocationProbe label="reset" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TokenRedirect', () => {
  it('forwards a Site-URL invite fallback to /accept-invite', async () => {
    renderAt('/?token_hash=abc&type=invite')
    await waitFor(() =>
      expect(screen.getByText('accept:/accept-invite?token_hash=abc&type=invite')).toBeInTheDocument()
    )
  })

  it('forwards a Site-URL recovery fallback to /reset-password', async () => {
    renderAt('/#access_token=abc&type=recovery')
    await waitFor(() =>
      expect(
        screen.getByText('reset:/reset-password#access_token=abc&type=recovery')
      ).toBeInTheDocument()
    )
  })

  it('leaves magic links on the current route', () => {
    renderAt('/#access_token=abc&type=magiclink')
    expect(screen.getByText('home:/#access_token=abc&type=magiclink')).toBeInTheDocument()
  })

  it('does not redirect when already on the target route', () => {
    renderAt('/accept-invite?token_hash=abc&type=invite')
    expect(screen.getByText('accept:/accept-invite?token_hash=abc&type=invite')).toBeInTheDocument()
  })
})
