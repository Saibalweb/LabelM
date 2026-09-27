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
- **Staff cannot delete customers** — soft-delete is owner/admin only via the
  `soft_delete_customer` RPC. Once a customer is archived, ALL of their labels,
  invoices, payments and dues are hidden from every screen until an owner/admin
  restores them (`restore_customer` RPC).
- Admin creation: **owner-only**.
- History: **no audit log for v1** — use per-record `created_by` / `updated_by` /
  `updated_at` / `deleted_by` instead. (Audit log is a future add-on.)

## 3. Roles & Permission Matrix
| Capability | Owner | Admin | Staff |
|---|---|---|---|
| Create/edit customers | ✓ | ✓ | ✓ |
| Create labels (from printed batches) | ✓ | ✓ | ✓ |
| Edit labels (uninvoiced only) | ✓ | ✓ | ✓ |
| Delete labels (uninvoiced only) | ✓ | ✓ | ✓ |
| Generate invoices (single + bulk) | ✓ | ✓ | ✗ |
| View all invoices | ✓ | ✓ | ✓ |
| Record payments / view dues & totals | ✓ | ✓ | ✓ |
| Soft-delete (archive) customers | ✓ | ✓ | ✗ |
| Restore archived customers | ✓ | ✓ | ✗ |
| Permanently purge archived | ✓ | ✗ | ✗ |
| Company settings (tax, branding, numbering) | ✓ | ✓ | ✗ |
| Invite/remove staff | ✓ | ✓ | ✗ |
| Invite/promote admins | ✓ | ✗ | ✗ |
| Transfer ownership / delete workspace | ✓ | ✗ | ✗ |

> **Note:** Label editing and deletion are only allowed while a label is
> **uninvoiced** (`invoice_id IS NULL`), for every role (owner/admin/staff). The
> DB enforces this via the `labels_lock_billed` / `labels_lock_billed_delete`
> triggers; once billed, labels are immutable. Invoice generation runs
> server-side (`generate_invoice_for_customer` / `generate_invoices_for_period`)
> as owner/admin-only transactions.

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
  `full_name`/`avatar` via column privileges. Role/status changes are only
  possible through `SECURITY DEFINER` RPCs (`admin_update_member_status`,
  `owner_update_member_role`). Inserts happen only via the invite Edge Function
  (service role). `owner_purge_member` (hard delete) also exists but is **not
  exposed in the UI** — see §15.
- Soft-delete: default queries filter `deleted_at IS NULL`.
- Customer soft-delete is owner/admin only, via `soft_delete_customer` (SECURITY
  DEFINER RPC — plain table updates can no longer set `deleted_at`; direct hard
  deletes are owner/admin too).
- Deleted customers are invisible to everyone: their labels / invoices / payments
  SELECT policies require the customer's `deleted_at IS NULL`, so history and
  unpaid dues stay hidden (data preserved, never erased).
- Owner/admin can list archived customers (`list_deleted_customers`) and restore
  them (`restore_customer`, clears `deleted_at`/`deleted_by`) — both SECURITY
  DEFINER RPCs gated to `get_my_role() in ('owner', 'admin')`.
- Restore: admin+; purge: owner-only via RPC.

## 8. Frontend Architecture
- Add `@supabase/supabase-js`; client at `src/lib/supabase.ts`.
- `authSlice` — session, user, profile, role, status.
- `draftSlice` — transient create-label form state.
- Customers / labels / invoices: **TanStack Query** (see `src/hooks/queries.ts`) with
  30s list `staleTime`; mutations invalidate their query keys. Invoice generation is
  server-side via `generate_invoices_for_period` / `generate_invoice_for_customer`
  RPCs (see `supabase/migrations/20260922120000_invoices_generate.sql`).
- Bootstrap: `supabase.auth.getSession()` + `onAuthStateChange`.
- On sign-out: `queryClient.clear()` (server cache) + `clearAuth()`.
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
   the #1 cause of auth emails landing in spam. (Interim domain only — see §14
   for the company-domain switch.)
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

## 14. TODO — Switch to the Real Company Domain (before production)

Custom SMTP currently uses an INTERIM domain (`saibal.dev`) only to exercise the
full auth flow. It must NOT be the production sender. Before go-live:

- [ ] Add the real company domain in ZeptoMail (Domains → Add Domain) and
      associate it with `agent_1`.
- [ ] Publish the DKIM TXT + CNAME records at the DNS provider (Vercel/Porkbun),
      click Verify, and wait for status `verified`.
- [ ] Add the production sender address (e.g. `noreply@<company-domain>`).
- [ ] Supabase → Auth → SMTP Settings: change **Sender email** to the company
      domain and **Sender name** to the company name (host `smtp.zeptomail.in`,
      port 587, user `emailapikey`, token stay the same). Currently the interim
      values are Sender email `noreply@saibal.dev` and Sender name `LabelM`.
- [ ] Supabase → Auth → URL Configuration: update Site URL + redirect URLs to the
      production origin.
- [ ] Update `.env` (comment + confirm `VITE_TRIAL_MODE=false`) and the Vercel
      project env var for production.
- [ ] Disable/remove the interim `saibal.dev` sender so it cannot send in prod.
- [ ] Send a real invite + magic link + password reset; confirm inbox delivery.

## 15. OPTIONAL — Member Hard-Delete (Purge) [not enabled]

**Status:** the `owner_purge_member(member_id)` RPC and
`teamService.purge()` still exist, but the UI no longer exposes a "Remove
member" hard delete. Members are **soft-removed by suspending** them
(`admin_update_member_status` → `status = 'suspended'`), which immediately
revokes all data access via RLS and is reversible.

### Why it is disabled
1. **Orphaned auth account.** `owner_purge_member` deletes only the `employees`
   row; the `auth.users` row survives (`employees.id` cascades *from*
   `auth.users`, not the other way). The ex-member keeps a valid credential:
   - they cannot sign up again (Supabase rejects the duplicate email, and public
     signups are off);
   - logging in with the old password "succeeds" but there is no profile, so the
     app sets status `idle` and bounces them back to `/login` with no error — a
     confusing dead end (`AuthListener.tsx` / `RequireAuth.tsx`).
2. **Lost attribution.** Every FK to `employees` is `on delete set null`, so a
   purge nulls the "who" columns on historical records — `labels.created_by` /
   `updated_by`, `invoices.generated_by`, `invoice_payments.received_by`,
   `customers.created_by` / `updated_by` / `deleted_by`,
   `customer_prices.created_by` / `updated_by`. The records themselves survive,
   but you lose the audit trail.
3. Suspension already satisfies the practical need (revoke access now, keep the
   history intact, stay reversible).

### How to re-enable later
1. **Clean up auth, not just the profile.** A Postgres RPC cannot call the Auth
   Admin API, so add a `purge-user` Edge Function (mirroring `revoke-user`) that
   uses the service role to `auth.admin.deleteUser(id)`; the `employees` row
   then cascades away (`employees.id → auth.users(id) ON DELETE CASCADE`).
   Alternatively call `owner_purge_member` first, then delete the auth user.
2. **Preserve attribution (recommended).** Before deleting, snapshot the actor's
   name onto the affected rows (add denormalized `created_by_name` /
   `generated_by_name` / `received_by_name` columns) or write a tombstone/audit
   row, so history does not render blank.
3. **Re-wire the UI.** Re-add a destructive, owner-only "Remove member" action
   in `src/pages/team.tsx` (with a confirmation dialog), call
   `teamService.purge()`, and re-introduce the `isOwner` branch that previously
   hard-deleted instead of suspending.
4. **Tests + checklist.** Unit: owner sees the action, admin/staff do not.
   E2E: purge removes the `employees` row **and** the `auth.users` row; labels /
   invoices remain with their attribution intact; the same email can be
   re-invited without the self-heal path.
5. **Keep the pieces.** Because the RPC and service method are retained, this is
   a UI + Edge-Function change only — no schema migration required unless you
   adopt the snapshot columns from step 2.
