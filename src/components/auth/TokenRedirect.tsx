import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const TARGET_BY_TYPE: Record<string, string> = {
  invite: '/accept-invite',
  recovery: '/reset-password',
}

export function TokenRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.slice(1))
    const type = search.get('type') ?? hash.get('type')
    const target = type ? TARGET_BY_TYPE[type] : undefined
    if (!target || location.pathname === target) return
    navigate(
      { pathname: target, search: location.search, hash: location.hash },
      { replace: true }
    )
  }, [location, navigate])

  return null
}
