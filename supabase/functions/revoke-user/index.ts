// LabelM — revoke-user Edge Function (service role).
// Invoked from the Team page (owner/admin only). Removes a pending invitation:
// deletes the `employees` row AND the matching `auth.users` row so the email can
// be invited again. Authorization mirrors the `admin_revoke_invite` RPC.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let input: { memberId?: string }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const memberId = input.memberId?.trim()
  if (!memberId) return json({ error: 'A member id is required' }, 400)

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

  const { data: target } = await admin
    .from('employees')
    .select('id, role, status')
    .eq('id', memberId)
    .maybeSingle()

  if (!target) return json({ error: 'Invitation not found' }, 404)
  if (target.status !== 'invited') {
    return json({ error: 'Only a pending invitation can be revoked' }, 409)
  }
  if (target.role === 'owner') {
    return json({ error: 'Cannot revoke the workspace owner' }, 403)
  }
  if (callerRole === 'admin' && target.role !== 'staff') {
    return json({ error: 'Admins can only manage staff' }, 403)
  }

  // Remove the profile row first, then the auth user (best effort) so a
  // re-invite of the same email never hits the "already registered" conflict.
  const { error: profileErr } = await admin.from('employees').delete().eq('id', memberId)
  if (profileErr) return json({ error: profileErr.message ?? 'Unable to revoke the invitation' }, 500)

  const { error: deleteErr } = await admin.auth.admin.deleteUser(memberId, false)
  if (deleteErr && !/not found/i.test(deleteErr.message)) {
    return json({ error: deleteErr.message ?? 'Unable to revoke the invitation' }, 500)
  }

  return json({ ok: true })
})
