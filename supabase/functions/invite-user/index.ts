// LabelM — invite-user Edge Function (service role).
// Invoked from the Team page (owner/admin only). Sends the invite email via
// Supabase Auth and creates the `employees` row with status 'invited'.
// Reference: https://supabase.com/docs/guides/functions

import { createClient } from 'npm:@supabase/supabase-js'

const SERVICE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const admin = createClient(SERVICE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let input: { email?: string; role?: string }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const email = input.email?.trim().toLowerCase()
  const role = input.role ?? 'staff'
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'A valid email is required' }, 400)
  }
  if (role !== 'staff' && role !== 'admin') {
    return json({ error: 'Role must be "staff" or "admin"' }, 400)
  }

  // Resolve the caller from the Authorization bearer JWT.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Missing bearer token' }, 401)

  const { data: caller, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !caller?.user) return json({ error: 'Unauthorized' }, 401)

  const { data: callerProfile } = await admin
    .from('employees')
    .select('role, status')
    .eq('id', caller.user.id)
    .maybeSingle()

  const callerRole = callerProfile?.role
  const callerActive = callerProfile?.status === 'active'
  if (!callerRole || !callerActive) return json({ error: 'Not an active member' }, 403)
  if (role === 'admin' && callerRole !== 'owner') {
    return json({ error: 'Only the workspace owner can grant the Admin role' }, 403)
  }

  // The invite link must point at the app that issued the request. Browsers
  // send an Origin header; fall back to an env-provided app URL.
  const origin = req.headers.get('Origin') ?? Deno.env.get('APP_URL') ?? new URL(req.url).origin
  const redirectTo = `${origin}/accept-invite`

  const { data: created, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo,
  })
  if (inviteErr) {
    // If the user already exists but has NOT joined yet, resend their invite
    // link instead of failing. Otherwise report a conflict.
    if (/already|registered|exists/i.test(inviteErr.message)) {
      const { data: existing } = await admin
        .from('employees')
        .select('id, status')
        .eq('email', email)
        .maybeSingle()

      if (existing?.status === 'invited') {
        const { error: resendErr } = await admin.auth.admin.resend({
          type: 'invite',
          email,
          options: { emailRedirectTo: redirectTo },
        })
        if (resendErr) {
          return json({ error: resendErr.message ?? 'Unable to resend the invitation' }, 500)
        }
        return json({ ok: true, id: existing.id })
      }
      return json({ error: 'That email already belongs to this workspace' }, 409)
    }
    return json({ error: inviteErr.message ?? 'Unable to send the invitation' }, 500)
  }

  const userId = created?.user?.id
  if (!userId) return json({ error: 'Unable to create the user' }, 500)

  // Mirror the role into app_metadata (never user_metadata) for JWT consumers.
  await admin.auth.admin.updateUserById(userId, { app_metadata: { role } })

  const { error: insertErr } = await admin.from('employees').insert({
    id: userId,
    email,
    full_name: nameFromEmail(email),
    role,
    status: 'invited',
  })
  if (insertErr) {
    // Best-effort cleanup of the auth user so a re-invite works cleanly.
    await admin.auth.admin.deleteUser(userId, false)
    return json({ error: insertErr.message ?? 'Unable to create the member record' }, 500)
  }

  return json({ ok: true, id: userId })
})