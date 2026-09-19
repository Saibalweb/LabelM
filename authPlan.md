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
- Roles source of truth: `employees.role`; mirrored to `app_metadata.role` (never
  `user_metadata`).
- `get_my_role()` security-definer helper used by RLS (avoids stale JWT roles;
  named to avoid the reserved `current_role` keyword).
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
- `employees` — id → auth.users, email, full_name, role (enum), status (enum),
  avatar, deactivated_at, deactivated_by, created_by, created_at, updated_at
- `company_settings` — single row: name, address, logo_url, tax_rate, invoice_prefix,
  label_prefix, currency
- `customers`, `labels`, `invoices` — line items + payments as JSONB (matches
  `src/lib/types.ts`); add `created_by`, `updated_by`, `updated_at`, `deleted_at`,
  `deleted_by`
- `counters` + `next_document_number(kind)` RPC (replaces `nextInvoiceId`/`nextSlNo`
  in `src/lib/repositories/storage.ts`), using `SELECT ... FOR UPDATE`

## 7. RLS Strategy
- All tables: `authenticated` only; `anon` has no access.
- Business tables: any authenticated member (single company).
- Role checks via `get_my_role()` for team management, settings, purge.
- `employees`: read own row; read team (admin+); direct update limited to
  `full_name`/`avatar` via column privileges. Role/status changes and purges are
  only possible through `SECURITY DEFINER` RPCs (`admin_update_member_status`,
  `owner_update_member_role`, `owner_purge_member`). Inserts happen only via the
  invite Edge Function (service role).
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

## 12. SMTP Switch Checklist (Built-in -> Custom, e.g. ZeptoMail)
No code changes are required — Supabase Auth relays through whatever SMTP is
configured. When moving off the built-in relay:

1. Buy/point a domain, then add the provider's DNS records (SPF, DKIM, DMARC) —
   ideally on a sending subdomain such as `mail.yourdomain.com`. Missing DKIM is
   the #1 cause of auth emails landing in spam.
2. Supabase dashboard → Authentication → SMTP Settings: enable **Custom SMTP**,
   enter host / port (587) / user / password, set Sender email
   (`no-reply@mail.yourdomain.com`) and Sender name.
3. Auth → URL Configuration: add the production origin (e.g.
   `https://app.yourdomain.com/accept-invite`). The `invite-user` function
   derives the invite link from the request `Origin` header.
4. Auth → Rate Limits: after enabling custom SMTP, Supabase caps sends at
   30/hour — raise it for real traffic.
5. Optional: set a custom domain on Supabase (`auth.yourdomain.com`) so
   magic-link / invite URLs show your domain, not `<ref>.supabase.co`.
6. Verify: send a real invite + magic link, check inbox and spam. A brand-new
   domain starts with zero reputation — expect a few weeks of cautious filtering.

## 13. Deploying the Invite Flow (Manual)
- Apply migrations: `supabase db push` (or paste SQL in the dashboard editor).
- Deploy the function:
  ```
  supabase link --project-ref <ref>
  supabase functions deploy invite-user
  ```
- Confirm Auth → Sign in/Providers has **Enable email signups** OFF.
- Auth → URL Configuration:
  - Set **Site URL** to the app origin (default `http://localhost:3000` makes
    every emailed link dead). Dev: `http://192.168.1.106:5173`; prod: the domain.
  - Add redirect URLs for the accept page, e.g. `http://localhost:5173/accept-invite`
    and `http://192.168.1.106:5173/accept-invite`.
- Auth → Email Templates → Invite user: link to the accept page directly so the
  token flow works (site-URL-based links hit a dead verify route):
  `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a>`.
- Note: the built-in SMTP relay only sends to the organization's team-member
  email addresses (2 emails/hour) — use Mailpit locally or add test addresses to
  the org team for invite testing.
