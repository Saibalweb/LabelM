# LabelM — Final TODO (pre-production)

Consolidated from `authPlan.md`, `bulkPrintPlan.md`, `TESTING.md`, and the
`checklist/*.md` files, cross-checked against the code. Use this as the single
release gate.

Legend: 🔴 blocker · 🟠 should-fix · 🟡 nice-to-have · ⚪ optional/future

---

## 1. Bugs

### 1.1 Auth Edge Function bugs (🔴 blockers for full auth)

| # | Bug | Location | Fix | Test marker |
|---|-----|----------|-----|-------------|
| BUG 1 | Re-invite/resend of a **pending** invite returns 500 (`employees_pkey`). `inviteUserByEmail` succeeds for an existing user, so the resend branch is skipped and the INSERT duplicates. | `supabase/functions/invite-user/index.ts:98-172` | Detect the existing `employees` row even when `inviteUserByEmail` returns no error; resend (pending) or 409 (active/suspended) instead of inserting. | `e2e/auth-invite.spec.ts:88`, `e2e/auth-email-delivery.spec.ts:131` (`test.fail`) |
| BUG 2 | **Staff can invite staff** — only admin-granting is owner-gated; there is no owner/admin check for staff invites (privilege escalation). | `invite-user/index.ts:88-91` | Require `callerRole in ('owner','admin')`; admin may only invite staff. | `e2e/auth-invite.spec.ts:146` (`test.fail`) |
| BUG 3 | **Staff can revoke pending invites** — only the caller's "active" status is checked. | `supabase/functions/revoke-user/index.ts:60-77` | Require owner/admin; admin may only revoke staff. | `e2e/auth-invite.spec.ts:250` (`test.fail`) |

After fixing, remove the `test.fail` markers and confirm Tier 1 auth e2e is green.

### 1.2 Auth dashboard config bugs (🔴 blockers — config, not code)

| # | Bug | Fix |
|---|-----|-----|
| BUG 4 | Emailed **invite** link lands on `/`, not `/accept-invite` (Site-URL fallback). | Supabase Auth → URL Configuration: set **Site URL** to the app origin and allowlist `/accept-invite`. |
| BUG 5 | **Password-reset** link lands on `/`, not `/reset-password` (user is signed in instead of asked to set a password). | Allowlist `/reset-password` in the same config. |
| BUG 6 | Link host is `<ref>.supabase.co`, not the app origin. | Set Site URL / redirect URLs to the real origin; optionally add a custom Supabase domain. |

Root cause: hosted **Site URL is a LAN IP** (`http://192.168.1.106:5173`) and the
redirect allowlist is incomplete. Apply on **both staging and prod**
(`authChecklist.md §3`, `authPlan.md §13`).

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

- [ ] `e2e/roles.spec.ts` — RBAC capability matrix, **referenced but does not exist** (`TESTING.md §5.3`, `authChecklist.md §5`).
- [ ] `scripts/seed-data.ts` + `scripts/reset-db.sql` — **referenced but missing**; large-data seed (12–15k labels) + `EXPLAIN ANALYZE` perf pass (`TESTING.md §5.4`).
- [ ] Invoice-generation **concurrency** tests (`invoiceChecklist.md §9`, rows 1–4).
- [ ] Dues seed-data **combination matrix** live pass (`duesChecklist.md §2`, rows 1–5).
- [ ] E2E: second payment via "Pay full remaining" → invoice flips to **Paid** (`duesChecklist.md §4`).
- [ ] Re-run `customers.spec.ts` against hosted Supabase (new placeholder + server-side search).
- [ ] Manual: invite → revoke → re-invite succeeds; invite → re-invite resends (`teamInviteChecklist.md §4`).
- [ ] (Optional) pgTAP DB-rule tests for RLS / triggers / RPCs (`TESTING.md §3`).

### 2.6 Functional gaps to resolve

- [x] **`company_profile` + `app_settings`** — **implemented** (`20260928120000_company_settings_and_bulk_print.sql`). Company details (name, tagline, contact, address, email, website, GSTIN, labeled phones), label size presets + custom with a 4×6in ceiling, `label_prefix`/`invoice_prefix`, `auto_mark_printed`, and `label_options`/`invoice_options` content toggles (incl. `showDueDate`). Label header no longer hardcodes "My Company Name"; invoices snapshot the company/customer header. UI in `src/pages/settings.tsx`; see `checklist/settingsChecklist.md`. Still deferred: **logo upload** (Storage bucket), **currency** / **tax_rate**.
- [ ] Decide ship-or-hide for every "coming soon" stub in §3.

### 2.7 Documentation drift (⚪ non-blocking)

- [ ] `README.md` is still the Vite template boilerplate — replace with a real project README.
- [ ] `authPlan.md §8` references removed items: `usePermission()`, `VITE_USE_LOCAL`, `src/lib/repositories/*`.
- [ ] `TESTING.md` references `VITE_USE_LOCAL`, `roles.spec.ts`, `scripts/*` that don't exist; stale test counts.
- [ ] Stale test counts in `authChecklist.md` (245), `invoiceChecklist.md` / `duesChecklist.md` (234) vs current (256).

---

## 3. Features "coming soon" (stubs — decide ship or hide)

| Feature | Location | Effort / notes |
|---------|----------|----------------|
| **Export labels** | `src/pages/dashboard.tsx` | ✅ **Done as PDF** — header button exports the selection, else the full filtered set; bulk bar exports selected labels (`src/lib/labelPdf.ts`). **CSV** still not implemented. |
| **Download PDF** (label) | `src/pages/preview.tsx` | ✅ **Done** — jsPDF, configured label size, `₹`→`Rs ` sanitised. |
| **Share via WhatsApp** | `src/pages/preview.tsx` | `wa.me` deep link |
| **Saved filter presets** | `src/pages/dashboard.tsx:801` | Persist named filter sets |
| **Change password** | `src/pages/settings.tsx:112` | `authService.updatePassword` already exists — easy win |
| **Sign out of all devices** | `src/pages/settings.tsx:164` | Supabase session revoke |
| **Theme presets / dark mode** | `src/pages/settings.tsx` | Per-user preference → to be stored in `localStorage` (decided); `next-themes` provider already mounted |
| **Cloud sync** | `src/pages/settings.tsx` | Copy is stale ("stored locally") — data is already in Supabase |
| **Auto-mark as printed** | `src/components/settings/LabelPrintingSection.tsx` | ✅ **Persisted** in `app_settings.auto_mark_printed` (real toggle, not a toast). Behaviour wiring into the create flow still pending. |
| **Notifications** | `src/pages/settings.tsx` | Toggle only toasts; no persistence (per-user, localStorage later) |

### 3.1 Bulk Print + Bulk PDF Export — ✅ SHIPPED

Status: **done** (`20260928120000_company_settings_and_bulk_print.sql`, `src/pages/dashboard.tsx`). See `checklist/bulkPrintChecklist.md`.

| Item | State |
|------|-------|
| `LabelPrintCard.tsx` + `printLabel.ts` + preview refactor | ✅ Done |
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
| **Real printer integration** | `preview.tsx` "Zebra ZT411 Ready" is hardcoded | Optional |
| **Filter-sheet server-side customer search** | `customersChecklist.md §5` | Keep full-list fetch until ~1,000+ customers; migration path documented |
| **Configurable default payment mode** | `duesChecklist.md §4` | Settings-driven, later |
| **Custom SMTP domain on Supabase** | `authPlan.md §12` | Optional polish |

---

## 5. Recommended release order

1. 🔴 Auth bugs BUG 1–3 (Edge Functions) + remove `test.fail` markers.
2. 🔴 Auth URL config BUG 4–6 (staging + prod).
3. ✅ ~~`company_settings` (branding / tax / prefixes)~~ — shipped as `company_profile` + `app_settings` (§2.6, §3.1).
4. 🟠 Prod deployment runbook (§2.1–2.4) + pending migrations (incl. `20260928120000_company_settings_and_bulk_print.sql`).
5. 🟡 Wire remaining easy stubs: Export CSV, Change password, dark-mode toggle (per-user via localStorage).
6. 🟡 Testing gaps (§2.5) — at minimum `roles.spec.ts` + concurrency tests.
7. ✅ ~~Bulk print~~ — shipped, with bulk PDF export (§3.1).
8. ⚪ Optional: purge, audit log, WhatsApp share, logo upload, currency/tax.
