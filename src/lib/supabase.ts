import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !publishableKey) {
  throw new Error(
    'Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE  _KEY to .env'
  )
}

export const supabase = createClient(url, publishableKey)