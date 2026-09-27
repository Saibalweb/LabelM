// Service-role test helpers for the auth E2E suite (staging only).
//
// The service-role key is read from the shell env (never committed) and is used
// only to (a) provision/tear down throwaway test users and (b) mint invite /
// magic / recovery links without waiting on SMTP. It is NOT used by the app.
//
// Everything here runs against staging; `assertStaging()` refuses to mutate a
// project whose ref does not match E2E_STAGING_REF when that guard is set.

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export type Role = 'owner' | 'admin' | 'staff'
export type MemberStatus = 'invited' | 'active' | 'suspended'

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

function readDotEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    out[key] = value
  }
  return out
}

const fileEnv = readDotEnv()

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? ''
export const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
export const PROJECT_REF =
  SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? ''
export const STAGING_REF = process.env.E2E_STAGING_REF ?? ''

export const hasServiceRole = SERVICE_ROLE_KEY.length > 0

let adminSingleton: SupabaseClient | null = null

export function admin(): SupabaseClient {
  if (!hasServiceRole) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Auth E2E tests need the staging service-role key in the shell env.'
    )
  }
  if (!adminSingleton) {
    adminSingleton = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return adminSingleton
}

// Guard: when E2E_STAGING_REF is provided, abort if we are pointed anywhere else.
export function assertStaging(): void {
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is missing (check .env)')
  if (STAGING_REF && PROJECT_REF !== STAGING_REF) {
    throw new Error(
      `Refusing to mutate a non-staging project: URL ref "${PROJECT_REF}" != E2E_STAGING_REF "${STAGING_REF}".`
    )
  }
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function insertEmployee(row: {
  id: string
  email: string
  role: Role
  status: MemberStatus
  fullName?: string
}): Promise<void> {
  const { error } = await admin()
    .from('employees')
    .insert({
      id: row.id,
      email: row.email.toLowerCase(),
      full_name: row.fullName ?? nameFromEmail(row.email),
      role: row.role,
      status: row.status,
    })
  if (error) throw new Error(`employees insert failed: ${error.message}`)
}

export interface TestUser {
  id: string
  email: string
  password: string
  role: Role
  status: MemberStatus
}

/** Confirmed member with a password — can sign in immediately. */
export async function createActiveUser(opts: {
  email: string
  role: Role
  password?: string
  fullName?: string
}): Promise<TestUser> {
  const password = opts.password ?? 'E2eTest123!'
  const { data, error } = await admin().auth.admin.createUser({
    email: opts.email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  await insertEmployee({
    id: data.user.id,
    email: opts.email,
    role: opts.role,
    status: 'active',
    fullName: opts.fullName,
  })
  trackUser(data.user.id)
  return { id: data.user.id, email: opts.email, password, role: opts.role, status: 'active' }
}

/** Confirmed auth user with NO employees row — a non-member with valid login. */
export async function createAuthUserOnly(opts: {
  email: string
  password?: string
}): Promise<{ id: string; email: string; password: string }> {
  const password = opts.password ?? 'E2eTest123!'
  const { data, error } = await admin().auth.admin.createUser({
    email: opts.email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  trackUser(data.user.id)
  return { id: data.user.id, email: opts.email, password }
}

/** Unconfirmed auth user with an `invited` employees row (no password yet). */
export async function createInvitedUser(opts: {
  email: string
  role: Role
}): Promise<TestUser> {
  const { data, error } = await admin().auth.admin.createUser({
    email: opts.email,
    email_confirm: false,
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  await insertEmployee({ id: data.user.id, email: opts.email, role: opts.role, status: 'invited' })
  trackUser(data.user.id)
  return { id: data.user.id, email: opts.email, password: '', role: opts.role, status: 'invited' }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface EmployeeRow {
  id: string
  email: string
  full_name: string
  role: Role
  status: MemberStatus
}

export async function getEmployeeByEmail(email: string): Promise<EmployeeRow | null> {
  const { data, error } = await admin()
    .from('employees')
    .select('id, email, full_name, role, status')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`employees select failed: ${error.message}`)
  return (data as EmployeeRow | null) ?? null
}

export async function getEmployeeById(id: string): Promise<EmployeeRow | null> {
  const { data, error } = await admin()
    .from('employees')
    .select('id, email, full_name, role, status')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`employees select failed: ${error.message}`)
  return (data as EmployeeRow | null) ?? null
}

export async function countEmployeesByEmail(email: string): Promise<number> {
  const { count, error } = await admin()
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('email', email.toLowerCase())
  if (error) throw new Error(`employees count failed: ${error.message}`)
  return count ?? 0
}

/** Force an employees.status directly (test provisioning only; app uses RPCs). */
export async function setEmployeeStatus(id: string, status: MemberStatus): Promise<void> {
  const { error } = await admin().from('employees').update({ status }).eq('id', id)
  if (error) throw new Error(`employees status update failed: ${error.message}`)
}

export async function getAuthUserByEmail(email: string): Promise<User | null> {
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < 1000) return null
  }
  return null
}

// ---------------------------------------------------------------------------
// Link minting (no email)
// ---------------------------------------------------------------------------

export type LinkType = 'invite' | 'magiclink' | 'recovery'

export interface MintedLink {
  actionLink: string
  hashedToken: string
  redirectTo: string
  verificationType: string
}

export async function mintLink(
  type: LinkType,
  email: string,
  redirectTo?: string
): Promise<MintedLink> {
  const { data, error } = await admin().auth.admin.generateLink({
    type,
    email,
    ...(redirectTo ? { options: { redirectTo } } : {}),
  })
  if (error || !data?.properties) {
    throw new Error(`generateLink(${type}) failed: ${error?.message}`)
  }
  const p = data.properties
  return {
    actionLink: p.action_link,
    hashedToken: p.hashed_token,
    redirectTo: p.redirect_to ?? '',
    verificationType: p.verification_type ?? type,
  }
}

/** App URL that the invite email template points at (see authPlan §13). */
export function acceptInviteUrl(baseURL: string, hashedToken: string, email?: string): string {
  const url = new URL('/accept-invite', baseURL)
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', 'invite')
  if (email) url.searchParams.set('email', email)
  return url.toString()
}

// ---------------------------------------------------------------------------
// Auth + Edge Function calls
// ---------------------------------------------------------------------------

/** Sign in with the anon key and return the access token (for role-gated calls). */
export async function accessTokenFor(email: string, password: string): Promise<string> {
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`signIn(${email}) failed: ${error?.message}`)
  return data.session.access_token
}

export interface FunctionResult {
  status: number
  body: Record<string, unknown> | null
}

export async function invokeFunction(
  name: string,
  body: Record<string, unknown>,
  token?: string,
  origin?: string
): Promise<FunctionResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      // The invite function derives the emailed link from Origin; browsers send
      // it automatically, but a server-side fetch must set it explicitly.
      ...(origin ? { Origin: origin } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = (await res.json()) as Record<string, unknown>
  } catch {
    parsed = null
  }
  return { status: res.status, body: parsed }
}

export interface RpcResult {
  status: number
  body: unknown
}

export async function callRpc(
  name: string,
  args: Record<string, unknown>,
  token: string
): Promise<RpcResult> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  })
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }
  return { status: res.status, body: parsed }
}

/** Raw PostgREST request with a member JWT — used to assert RLS behaviour. */
export async function restRequest(
  path: string,
  opts: { method?: string; body?: unknown; token: string; prefer?: string }
): Promise<RpcResult> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${opts.token}`,
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  })
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }
  return { status: res.status, body: parsed }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

const createdUserIds: string[] = []

export function trackUser(id: string): void {
  createdUserIds.push(id)
}

/** Hard-delete every provisioned user. `employees` rows cascade via FK. */
export async function cleanupTrackedUsers(): Promise<void> {
  for (const id of createdUserIds.splice(0)) {
    try {
      await admin().auth.admin.deleteUser(id, false)
    } catch {
      // best effort — a test may have already purged the user
    }
  }
}

/**
 * Hard-delete every auth user whose email starts with `prefix`. Catches users
 * created by the invite Edge Function (which our registry never sees).
 */
export async function cleanupUsersByEmailPrefix(prefix: string): Promise<number> {
  const lower = prefix.toLowerCase()
  const matches: string[] = []
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users) break
    for (const user of data.users) {
      if (user.email?.toLowerCase().startsWith(lower)) matches.push(user.id)
    }
    if (data.users.length < 1000) break
  }
  for (const id of matches) {
    try {
      await admin().auth.admin.deleteUser(id, false)
    } catch {
      // best effort
    }
  }
  return matches.length
}
