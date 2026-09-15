# LabelM — Auth Plan

## 1. Overview
LabelM is a closed, company-only label & invoice app. No public sign-up. Only
invited company members can authenticate. Backend: Supabase (Auth + Postgres + RLS).

## 2. Locked Decisions
- Access: **invite-only**, public signups disabled in Supabase.
- Accounts: **one account per employee** (audit + attribution).
- Login methods: **email + password** AND **magic link** (both).
- Provisioning: **in-app admin invite page** (Edge Function + service role).
- Roles: **owner** (1), **admin**, **staff**.
- Tenancy: **single company**.
- Deletes: **soft-delete only** (`deleted_at` / `deleted_by`); lists filter active.
- Staff: can view all invoices, record payments, view dues/totals.
- Admin creation: **owner-only**.
- History: **no audit log for v1** — use per-record `created_by` / `updated_by` /
  `updated_at` / `deleted_by` instead. (Audit log is a future add-on.)

## 3. Roles & Permission Matrix
| Capability | Owner | Admin | Staff |
|---|---|---|---|
| Create/edit labels, customers, invoices | ✓ | ✓ | ✓ |
| View all invoices | ✓ | ✓ | ✓ |
| Record payments / view dues & totals | ✓ | ✓ | ✓ |
| Soft-delete (archive) records | ✓ | ✓ | ✓ |
| Restore archived records | ✓ | ✓ | ✗ |
| Permanently purge archived | ✓ | ✗ | ✗ |
| Company settings (tax, branding, numbering) | ✓ | ✓ | ✗ |
| Invite/remove staff | ✓ | ✓ | ✗ |
| Invite/promote admins | ✓ | ✗ | ✗ |
| Transfer ownership / delete workspace | ✓ | ✗ | ✗ |

## 4. Auth Model
- Supabase Auth, `Enable sign ups = OFF`.
- Roles source of truth: `profiles.role`; mirrored to `app_metadata.role` (never
  `user_metadata`).
- `current_role()` security-definer helper used by RLS (avoids stale JWT roles).
- Invites: Edge Function `invite-user` (service role) calls
  `auth.admin.inviteUserByEmail`, sets `app_metadata.role` + creates `profiles` row.
- SMTP required for magic links + invites. Recommended provider: **Resend**.
  Built-in Supabase email is test-only / rate-limited.
- Magic links expire in 15 min; enable auth rate limiting.

## 5. Pages & Routes
### Public (no AppLayout)
| Page | Route | Notes |
|---|---|---|
| Sign in | `/login` | Email+password, "Email me a magic link", Forgot password link |
| Magic link sent | state of `/login` | Confirmation only; no input |
| Forgot password | `/forgot-password` | Request reset email |
| Reset link sent | state | Confirmation only |
| Set new password | `/reset-password` | New + confirm password, strength meter |
| Accept invite | `/accept-invite` | New user: name + password |
| Access restricted | `/unauthorized` | Authenticated but no role / suspended |

### Authenticated
| Page | Route | Access |
|---|---|---|
| Team management | `/team` | Admin+ |
| Invite member | dialog over `/team` | Admin+ |
| Settings → Account | `/settings` | All |
| User menu dropdown | TopNav component | All |

Notes:
- "Access restricted" = valid credentials but unauthorized member (not a
  wrong-password error). Wrong password shows inline error on `/login`.
- Clicking a magic link logs in directly (no password page). Reset link →
  Set new password. Invite link → Accept invite.

## 6. Supabase Schema
- `profiles` — id → auth.users, full_name, email, role, status, created_at, last_seen_at
- `company_settings` — single row: name, address, logo_url, tax_rate, invoice_prefix,
  label_prefix, currency
- `customers`, `labels`, `invoices` — line items + payments as JSONB (matches
  `src/lib/types.ts`); add `created_by`, `updated_by`, `updated_at`, `deleted_at`,
  `deleted_by`
- `counters` + `next_document_number(kind)` RPC (replaces `nextInvoiceId`/`nextSlNo`
  in `src/lib/repositories/storage.ts`), using `SELECT ... FOR UPDATE`

## 7. RLS Strategy
- All tables: `authenticated` only.
- Business tables: any authenticated member (single company).
- Role checks via `current_role()` for team management, settings, purge.
- Soft-delete: default queries filter `deleted_at IS NULL`.
- Restore: admin+; purge: owner-only via RPC.

## 8. Frontend Architecture
- Add `@supabase/supabase-js`; client at `src/lib/supabase.ts`.
- `authSlice` — session, user, profile, role, status.
- Bootstrap: `supabase.auth.getSession()` + `onAuthStateChange`.
- On sign-out: clear `customers` / `labels` / `invoices` / `draft` slices.
- `RequireAuth` wraps existing routes in `src/App.tsx`.
- Public routes: `/login`, `/forgot-password`, `/reset-password`, `/accept-invite`,
  `/unauthorized`.
- `usePermission()` hook gates UI actions by role (server still enforces via RLS).
- `TopNav.tsx` hardcoded avatar → real user + dropdown.
- `settings.tsx` "Sync with cloud coming soon" → real Account/Security section.
- Data layer: add `SupabaseCustomerRepository` etc. against existing interfaces in
  `src/lib/repositories/types.ts`, with `VITE_USE_LOCAL` flag to keep the
  localStorage demo working.

## 9. Environment
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_USE_LOCAL=false
```
Never ship the service role key in the client.

## 10. Build Phases
1. Supabase project, migrations (schema, RLS, helper fns, RPCs), SMTP + email templates.
2. Client supabase + `authSlice` + protected routing + auth screens wiring.
3. Invite Edge Function + Team page + invite dialog.
4. Repository swap + number RPC + soft-delete/restore UI.
5. Role gating + Settings account section + user menu.
6. Cleanup, seed data, verify `npm run build` + `npm run lint`.

## 11. Out of Scope (Future)
- Audit log page + `audit_log` table.
- Multi-tenant / company_id isolation.
- 2FA, SSO.
