import { useEffect, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth'
import { bootstrapStart, clearAuth, setAuth } from '@/store/slices/authSlice'
import { useAppDispatch } from '@/store/hooks'
import type { Employee } from '@/lib/types'

export function AuthListener() {
  const dispatch = useAppDispatch()
  const loadedUserId = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    async function handleSession(session: Session | null) {
      if (!active) return
      const userId = session?.user.id ?? null
      if (userId === loadedUserId.current) return
      loadedUserId.current = userId

      let profile: Employee | null = null
      if (session) {
        try {
          profile = await authService.getProfile(session.user.id)
        } catch {
          profile = null
        }
      }
      if (active) dispatch(setAuth({ session, profile }))
    }

    dispatch(bootstrapStart())

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        loadedUserId.current = null
        dispatch(clearAuth())
        return
      }
      void handleSession(session)
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) {
        loadedUserId.current = null
        dispatch(setAuth({ session: null, profile: null }))
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [dispatch])

  return null
}