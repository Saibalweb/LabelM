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

// CORS: echo only allowlisted origins. `ALLOWED_ORIGINS` is a comma-separated
// list set as a Supabase secret (see supabase/functions/.env.example); it falls
// back to APP_URL, then '*' for local dev. CORS is not an auth boundary — the
// gateway's verify_jwt + the role checks below are.
// Normalise by dropping any trailing slash — browsers never send one in Origin,
// so `https://app.com/` in the secret must still match `https://app.com`.
const stripSlash = (value: string) => value.trim().replace(/\/+$/, '')

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(stripSlash)
  .filter(Boolean)

function corsHeaders(req: Request): Record<string, string> {
  const origin = stripSlash(req.headers.get('Origin') ?? '')
  const allowed = ALLOWED_ORIGINS.length
    ? ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]
    : stripSlash(Deno.env.get('APP_URL') ?? '') || '*'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// The Admin API has no getUserByEmail, so page through listUsers. Fine for a
// closed, single-company workspace (10 pages x 1000 users).
async function findUserByEmail(email: string) {
  const perPage = 1000
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < perPage) return null
  }
  return null
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
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
  // Only owners and admins may invite; admins may only invite staff (below).
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    return json({ error: 'Only owners and admins can invite members' }, 403)
  }
  if (role === 'admin' && callerRole !== 'owner') {
    return json({ error: 'Only the workspace owner can grant the Admin role' }, 403)
  }

  // The invite link must point at the app that issued the request. Browsers
  // send an Origin header; fall back to an env-provided app URL.
  const origin = req.headers.get('Origin') ?? Deno.env.get('APP_URL') ?? new URL(req.url).origin
  const redirectTo = `${origin}/accept-invite`

  // Look up the membership BEFORE inviting. `inviteUserByEmail` can return
  // success (no error) for an address that already has an auth user, so an
  // error-only branch misses the pending re-invite and the INSERT below then
  // hits employees_pkey. Resolve the existing row explicitly instead.
  const { data: existing } = await admin
    .from('employees')
    .select('id, status')
    .eq('email', email)
    .maybeSingle()

  // Active or suspended member: a real conflict.
  if (existing && existing.status !== 'invited') {
    return json({ error: 'That email already belongs to this workspace' }, 409)
  }

  // Still pending: resend the invite email, never insert a duplicate. Calling
  // inviteUserByEmail again is the supported resend path — it returns success
  // for an existing unconfirmed user and issues a fresh token. (The Admin API
  // exposes no `resend`, and `auth.resend` rejects type 'invite'.)
  if (existing?.status === 'invited') {
    const { error: resendErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role },
      redirectTo,
    })
    if (resendErr) {
      return json({ error: resendErr.message ?? 'Unable to resend the invitation' }, 500)
    }
    return json({ ok: true, id: existing.id })
  }

  const { data: created, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo,
  })

  let userId = created?.user?.id

  if (inviteErr) {
    if (!/already|registered|exists/i.test(inviteErr.message)) {
      return json({ error: inviteErr.message ?? 'Unable to send the invitation' }, 500)
    }

    // Orphaned auth user — an invite/revoke left the auth.users row behind but
    // the employees row is gone. Remove it and retry so re-invites work.
    const orphan = await findUserByEmail(email)
    if (!orphan) {
      return json({ error: 'That email already belongs to this workspace' }, 409)
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(orphan.id, false)
    if (deleteErr) {
      return json({ error: deleteErr.message ?? 'Unable to reset the previous invitation' }, 500)
    }

    const { data: retried, error: retryErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role },
      redirectTo,
    })
    if (retryErr || !retried?.user?.id) {
      return json({ error: retryErr?.message ?? 'Unable to send the invitation' }, 500)
    }
    userId = retried.user.id
  }

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