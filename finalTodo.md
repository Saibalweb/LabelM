# LabelM — Final TODO (pre-production)

Consolidated from `authPlan.md`, `bulkPrintPlan.md`, `TESTING.md`, and the
`checklist/*.md` files, cross-checked against the code. Use this as the single
release gate.

Legend: 🔴 blocker · 🟠 should-fix · 🟡 nice-to-have · ⚪ optional/future

---

## 1. Bugs

### 1.1 Auth Edge Function bugs (🔴 blockers for full auth) — ✅ fixed, Tier 1 green

Fixed in `supabase/functions/invite-user/index.ts` + `revoke-user/index.ts`; the
`test.fail` markers are removed. **Tier 1 (`npm run test:e2e:auth`, staging):
34/34 passed (2026-09-28)**, verifying BUG 1, BUG 2 and BUG 3.

| # | Bug | Location | Fix | Test marker |
|---|-----|----------|-----|-------------|
| BUG 1 ✅ | Re-invite/resend of a **pending** invite returns 500 (`employees_pkey`). `inviteUserByEmail` succeeds for an existing user, so the resend branch was skipped and the INSERT duplicated. | `supabase/functions/invite-user/index.ts` | The `employees` row is looked up **before** inviting: pending → re-call `inviteUserByEmail` to resend, active/suspended → 409, so the duplicate INSERT never runs. The original resend call (`admin.auth.admin.resend`) does not exist on the Admin API — it threw a `TypeError` → generic 500. | `e2e/auth-invite.spec.ts:87` — verified green (Tier 1); `e2e/auth-email-delivery.spec.ts:130` — marker removed (Tier 2, SMTP) |
| BUG 2 ✅ | **Staff can invite staff** — only admin-granting is owner-gated; there is no owner/admin check for staff invites (privilege escalation). | `invite-user/index.ts` | Require `callerRole in ('owner','admin')`; admin may only invite staff. | `e2e/auth-invite.spec.ts:138` — verified green (Tier 1) |
| BUG 3 ✅ | **Staff can revoke pending invites** — only the caller's "active" status is checked. | `supabase/functions/revoke-user/index.ts` | Require owner/admin; admin may only revoke staff. | `e2e/auth-invite.spec.ts:239` — verified green (Tier 1) |

Both functions are deployed to **staging** and green. Still deploy them to
**prod** at ship time — the fixes live in the Edge Functions, not migrations.

Surfaced by the same run and fixed: the Team "Member options" dropdown couldn't
be closed by re-clicking its trigger (the document `mousedown` close handler
nulled the state before the button's `onClick` toggle re-opened it) —
`src/pages/team.tsx` now stops that mousedown from propagating.

### 1.2 Auth dashboard config bugs (🔴 blockers — config, not code)

| # | Bug | Fix |
|---|-----|-----|
| BUG 4 | Emailed **invite** link lands on `/`, not `/accept-invite` (Site-URL fallback). | Supabase Auth → URL Configuration: set **Site URL** to the app origin and allowlist `/accept-invite`. |
| BUG 5 | **Password-reset** link lands on `/`, not `/reset-password` (user is signed in instead of asked to set a password). | Allowlist `/reset-password` in the same config. |
| BUG 6 | Link host is `<ref>.supabase.co`, not the app origin. | **Not a config bug** — recovery/magic links go through the GoTrue verify endpoint (`.ConfirmationURL`) and 302 to `redirect_to`. Only a custom Supabase domain changes the host. To land recovery directly on the app, rewrite `recovery.html` to use `{{ .RedirectTo }}` like `invite.html`. |

Root cause: hosted **Site URL is a LAN IP** (`http://192.168.1.106:5173`) and the
redirect allowlist is incomplete. Apply on **both staging and prod**
(`authChecklist.md §3`, `authPlan.md §13`).

Concrete settings (Auth → URL Configuration):

| Field | Value |
|-------|-------|
| **Site URL** | the real app origin (`https://labelm.saibal.dev` on prod; staging URL on staging) — **not** the LAN IP |
| **Redirect URLs (prod)** | exact: `<origin>/accept-invite`, `<origin>/reset-password` (Supabase recommends exact paths in prod) |
| **Redirect URLs (local/dev)** | `http://localhost:5173/**` and/or `http://192.168.1.106:5173/**` — `**` is valid (globstar, matches across `/`) but is intended for dev/preview only |

`supabase/config.toml` mirrors the local-dev allowlist; the hosted dashboard is
the source of truth for staging/prod.

**Manual verification:** BUG 4/5 are only observable through a real emailed link.
Follow the manual Tier 2 runbook in `authChecklist.md §7` (prereqs, per-case
steps, pass criteria) since YOPmail's Turnstile blocks the automated reader.

### 1.3 Known non-blocking bugs / risks

| # | Bug | Notes |
|---|-----|-------|
| BUG 7 | Accept-invite while already signed in silently swaps the session to the invitee. | Add a "switch accounts?" confirmation; clear the React Query cache when the authenticated user id changes; fix the `restricted` race (`authChecklist.md §5`). |
| BUG 8 | `owner_purge_member` leaves an orphaned `auth.users` row. | Purge is not exposed in the UI; `invite-user` self-heals on re-invite. See §4. |
| BUG 9 | Concurrent invoice generation with **overlapping different periods** can produce a stale/inflated amount snapshot; bulk generation is all-or-nothing. | `invoiceChecklist.md §9`; needs the concurrency tests below. |

---

## 2. Pre-production TODO

### 2.1 Migrations

- [ ] Apply all migrations to the hosted project: `npx supabase db push` (or paste SQL).
- [ ] **Pending apply (documented):** `20260925210000_customer_soft_delete_rpc.sql`, `20260925220000_customer_history_hide_restore.sql` (`labelChecklist.md §7/§8`).
- [ ] Confirm the newest migrations are applied: `20260927120000_invoice_due_date.sql`, `20260927180000_drop_admin_revoke_invite.sql`, `20260928120000_company_settings_and_bulk_print.sql`.
- [ ] Verify no orphan migration remains from the (removed) owner/admin-only label-delete change — it was deleted and is **not** needed.
- [x] `20260928120000_company_settings_and_bulk_print.sql` added — `company_profile` + `app_settings` (RLS + seed), invoice `company_snapshot`/`customer_snapshot`, `mark_labels_printed`, and `generate_invoice_for_customer` reads `invoice_prefix` + snapshots headers. Confirm applied to staging/prod.

### 2.2 Prod Supabase project (`TESTING.md §7`, `authPlan.md §13`)

- [ ] Create a fresh **prod** Supabase project; apply all migrations in order (prod starts clean).
- [ ] Re-set per-project Auth settings (not carried by migrations): **Enable sign ups OFF**, Site URL + redirect URLs, email templates (`supabase/templates/`), SMTP, rate limits.
- [ ] Deploy both Edge Functions to staging **and** prod:
      `supabase functions deploy invite-user` and `supabase functions deploy revoke-user`.
      Set the `ALLOWED_ORIGINS` / `APP_URL` secrets first (see §2.8).
- [ ] Run `supabase/seed-first-owner.sql` with the client's email + a fresh password.
- [ ] Confirm free-tier project cap (staging + prod = 2).

### 2.3 SMTP / domain (`authPlan.md §14`)

- [ ] Add the real company domain in ZeptoMail and associate it with `agent_1`.
- [ ] Publish DKIM TXT + CNAME records at the DNS provider, verify, wait for `verified`.
- [ ] Add the production sender (e.g. `noreply@<company-domain>`).
- [ ] Supabase → Auth → SMTP Settings: set Sender email to the company domain and Sender name to the company name (host `smtp.zeptomail.in`, port 587, user `emailapikey`).
- [ ] Disable/remove the interim `saibal.dev` sender so it cannot send in prod.
- [ ] Send a real invite + magic link + password reset; confirm inbox delivery.

### 2.4 Frontend deploy (`TESTING.md §2.2`, `§7`)

- [ ] Cloudflare Pages env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TRIAL_MODE`.
- [ ] `public/_redirects` present (`/* /index.html 200`) — already committed; verify on deploy.
- [ ] Confirm `VITE_TRIAL_MODE=false` for prod (currently `false` in `.env`; verify intent — Stage 1 trial ships with `true`).
- [ ] Point `labelm.saibal.dev` (now) / client domain (later) at the Pages project.
- [ ] Run the smoke E2E suite against the deployed URL (`E2E_BASE_URL=... npm run test:e2e`).

### 2.5 Testing gaps (`TESTING.md`, checklists)

- [x] **`e2e/roles.spec.ts` — RBAC capability matrix (shipped, 14/14 green).** Drives the app as owner/admin/staff (fixed creds from `.env`) and asserts the UI-level matrix: `/invoice/new` + `/team` blocked for staff, settings view-only vs editable, invoice-generation button gating, customer archive/restore ("Deleted customers") gating, and owner-only "invite/promote admins". Run `npm run test:e2e:roles` (needs `ADMIN_EMAIL`/`ADMIN_PASSWORD` + `STAFF_EMAIL`/`STAFF_PASSWORD`, `VITE_TRIAL_MODE=false`; no service-role key). **Not yet covered:** payment-delete gating (owner/admin) — needs a seeded invoice+payment. See `TESTING.md §5.3`, `authChecklist.md §5`.
- [ ] `scripts/seed-data.ts` + `scripts/reset-db.sql` — **referenced but missing**; large-data seed (12–15k labels) + `EXPLAIN ANALYZE` perf pass (`TESTING.md §5.4`).
- [ ] Invoice-generation **concurrency** tests (`invoiceChecklist.md §9`, rows 1–4).
- [ ] Dues seed-data **combination matrix** live pass (`duesChecklist.md §2`, rows 1–5).
- [ ] E2E: second payment via "Pay full remaining" → invoice flips to **Paid** (`duesChecklist.md §4`).
- [ ] Re-run `customers.spec.ts` against hosted Supabase (new placeholder + server-side search).
- [ ] Manual: invite → revoke → re-invite succeeds; invite → re-invite resends (`teamInviteChecklist.md §4`).
- [ ] (Optional) pgTAP DB-rule tests for RLS / triggers / RPCs (`TESTING.md §3`).

### 2.6 Functional gaps to resolve

- [x] **`company_profile` + `app_settings`** — **implemented** (`20260928120000_company_settings_and_bulk_print.sql`). Company details (name, tagline, contact, address, email, website, GSTIN, labeled phones), label size presets + custom with a 4×6in ceiling, `label_prefix`/`invoice_prefix`, `auto_mark_printed`, and `label_options`/`invoice_options` content toggles (incl. `showDueDate`). Label header no longer hardcodes "My Company Name"; invoices snapshot the company/customer header. UI in `src/pages/settings.tsx`; see `checklist/settingsChecklist.md`. Settings now render **read-only summaries with modal editing** (staff view-only), plus **change password** and **sign out this/all devices** (`settingsChecklist.md §10`). Still deferred: **logo upload** (Storage bucket), **currency** / **tax_rate**.
- [ ] Decide ship-or-hide for every "coming soon" stub in §3.

### 2.7 Documentation drift (⚪ non-blocking)

- [ ] `README.md` is still the Vite template boilerplate — replace with a real project README.
- [ ] `authPlan.md §8` references removed items: `usePermission()`, `VITE_USE_LOCAL`, `src/lib/repositories/*`.
- [ ] `TESTING.md` references `VITE_USE_LOCAL`, `roles.spec.ts`, `scripts/*` that don't exist; stale test counts.
- [ ] Stale test counts in `authChecklist.md` (245), `invoiceChecklist.md` / `duesChecklist.md` (234) vs current (256).

### 2.8 Edge Function CORS hardening (🟠)

`invite-user` + `revoke-user` previously sent `Access-Control-Allow-Origin: *`.
CORS is **not** the auth boundary here (the gateway's `verify_jwt` + the
in-function role checks are), but a wildcard is poor prod hygiene. Both functions
now echo only allowlisted origins from the `ALLOWED_ORIGINS` secret (falling back
to `APP_URL`, then `*` for local dev).

- [x] Code: `corsHeaders(req)` in both functions, `Vary: Origin`, methods
      restricted to `POST, OPTIONS`, plus `supabase/functions/.env.example`.
- [ ] Set the secret on **staging** (Dashboard → Edge Functions → Secrets, or):
      `supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,http://192.168.1.106:5173" --project-ref hleadfeikniejvlhbqzd`
      and `APP_URL=http://localhost:5173`.
- [ ] Set it on **prod** when created: `ALLOWED_ORIGINS=https://labelm.saibal.dev`
      (+ client domain later) and `APP_URL=https://labelm.saibal.dev`.
- [ ] Redeploy both functions after setting secrets (secrets apply on the next
      invocation; redeploy if a warm instance doesn't pick them up).
- [ ] Do **not** set `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
      `SUPABASE_SERVICE_ROLE_KEY` — they are auto-injected.

---

## 3. Features "coming soon" (stubs — decide ship or hide)

| Feature | Location | Effort / notes |
|---------|----------|----------------|
| **Export labels** | `src/pages/dashboard.tsx` | ✅ **Done as PDF** — header button exports the selection, else the full filtered set; bulk bar exports selected labels (`src/lib/documentPdf.ts`). **CSV** still not implemented. |
| **Download PDF** (label) | `src/pages/preview.tsx` | ✅ **Done** — jsPDF, configured label size, `₹`→`Rs ` sanitised. |
| **Saved filter presets** | `src/pages/dashboard.tsx:801` | Persist named filter sets |
| **Change password** | `src/components/settings/ChangePasswordDialog.tsx` | ✅ **Done** — settings modal with strength meter + rules; `authService.updatePassword` |
| **Sign out of all devices** | `src/pages/settings.tsx` | ✅ **Done** — `authService.signOutAllDevices()` (`signOut({ scope: 'global' })`); this-device sign-out has a confirm dialog too |
| **Read-only settings + edit modal** | `src/components/settings/*` | ✅ **Done** — company details & label/printing render summaries, edited via modal; staff see values but no Edit action |
| **Theme presets / dark mode** | `src/pages/settings.tsx` | Per-user preference → to be stored in `localStorage` (decided); `next-themes` provider already mounted |
| **Cloud sync** | — | ✅ **Removed** — toast-only stub deleted; About copy now says data is synced to the workspace |
| **Auto-mark as printed** | `src/components/settings/LabelPrintingSection.tsx` | ✅ **Persisted** in `app_settings.auto_mark_printed` (real toggle, not a toast). Behaviour wiring into the create flow still pending. |
| **Notifications** | — | ✅ **Removed** — toast-only stub deleted (no persistence model) |

### 3.1 Bulk Print + Bulk PDF Export — ✅ SHIPPED

Status: **done** (`20260928120000_company_settings_and_bulk_print.sql`, `src/pages/dashboard.tsx`). See `checklist/bulkPrintChecklist.md`.

| Item | State |
|------|-------|
| `LabelPrintCard.tsx` + `printDocument.ts` + preview refactor | ✅ Done |
| Print CSS generalised for **N sheets** (`.label-sheet`, one page per label, configured size) | ✅ Done |
| `mark_labels_printed(p_ids)` SECURITY DEFINER RPC + migration | ✅ Done |
| `labelService.markPrinted(ids)` + `useBulkMarkPrinted()` | ✅ Done |
| Dashboard checkbox column, select-all-page, bulk action bar | ✅ Done |
| Billed rows **selectable** (Option A) — export/reprint; status flip stays server-guarded | ✅ Done |
| `handleBulkPrint()` hidden `#bulkPrintArea` → print → `afterprint` → mark printed → toast | ✅ Done |
| Bulk **Export PDF** (jsPDF, one page per label) + header Export PDF (selection or filtered set) | ✅ Done |
| Unit tests + `e2e/bulkPrint.spec.ts` + `e2e/bulkPrintStatus.spec.ts` | ✅ Done |
| "Print whole unprinted queue" (server-side ID fetch) | Out of scope |
| Status-flip matrix (unbilled draft flips; unbilled printed / billed / billed-draft no-op; idempotent; export never flips) | ✅ Unit + e2e |

---

## 4. Optional / deferred

| Feature | Source | Notes |
|---------|--------|-------|
| **Member hard-delete (purge)** | `authPlan.md §15` | RPC exists, UI removed; needs auth-user cleanup + attribution snapshot before re-enabling |
| **Audit log** | `authPlan.md §11`, stitch "ditched" | Out of scope for v1 |
| **Multi-tenant / `company_id` isolation** | `authPlan.md §11` | Future |
| **2FA / SSO** | `authPlan.md §11` | Future |
| **Dedicated Label History page** | stitch reference (desktop/mobile) | Dashboard "Recent Labels" covers it; separate page optional |
| **Real printer integration** | Hardcoded "Printer Status" card removed from `preview.tsx`; wire to a real status source if needed | Optional |
| **Filter-sheet server-side customer search** | `customersChecklist.md §5` | Keep full-list fetch until ~1,000+ customers; migration path documented |
| **Configurable default payment mode** | `duesChecklist.md §4` | Settings-driven, later |
| **Custom SMTP domain on Supabase** | `authPlan.md §12` | Optional polish |
| **Share via WhatsApp** | `preview.tsx` | Not implementing — UI stub removed; deferred (would need a `wa.me` deep link) |

---

## 5. Recommended release order

1. ✅ ~~Auth bugs BUG 1–3 (Edge Functions) + remove `test.fail` markers~~ — fixed; Tier 1 34/34 green (§1.1).
2. 🔴 Auth URL config BUG 4–6 (staging + prod).
3. ✅ ~~`company_settings` (branding / tax / prefixes)~~ — shipped as `company_profile` + `app_settings` (§2.6, §3.1).
4. 🟠 Prod deployment runbook (§2.1–2.4) + pending migrations (incl. `20260928120000_company_settings_and_bulk_print.sql`).
5. 🟡 Wire remaining easy stubs: Export CSV, dark-mode toggle (per-user via localStorage). ✅ Settings view/edit + change-password + sign-out-device(s) shipped (`settingsChecklist.md §10`).
6. 🟡 Testing gaps (§2.5) — at minimum `roles.spec.ts` + concurrency tests.
7. ✅ ~~Bulk print~~ — shipped, with bulk PDF export (§3.1).
8. ⚪ Optional: purge, audit log, WhatsApp share, logo upload, currency/tax.
