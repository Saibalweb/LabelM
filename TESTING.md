# LabelM — Testing Plan & Guide

This document captures the agreed testing strategy, splits the work into stages
(so SMTP/auth-dependent testing is cleanly deferred), and tells you exactly how
to run each layer.

---

## 1. Strategy Overview

- **Two-phase delivery.** Stage 1 ships a working product to the client with a
  single pre-created account and **no SMTP** (trial mode). Stage 2 adds full
  auth (SMTP + domain + Edge Functions) and is tested later on a **staging**
  Supabase project — never on the client's database.
- **The app already runs fully against hosted Supabase** (no `VITE_USE_LOCAL`
  flag anymore). All business rules that live in Postgres (RLS, triggers, RPCs)
  behave exactly like production when tested here.
- **Never run auth E2E tests against the client's DB.** They mutate data
  (invites create real users, suspend/purge change members). Auth tests run on
  staging only.

### Rule of thumb

| What you're testing | Where it runs |
|---|---|
| Unit + component tests | Local, mocked Supabase (no DB, no network) |
| Core E2E (labels, invoices, customers, filters, navigation) | Localhost dev server, against **staging** project |
| Auth E2E (magic link, forgot/reset, invite, team actions) | Localhost dev server, against **staging** project, **only after SMTP configured on staging** |
| Trial delivery + smoke tests | Cloudflare Pages (deployed URL) |
| Seed / large-data pass | Staging project via service-role scripts |
| Destructive / reset operations | Staging only |

---

## 2. Environments

### 2.1 Supabase projects

| Project | Purpose | When |
|---|---|---|
| Current project (this one) | **Staging** — dev + all tests + seed data | Now |
| Future project | **Prod** — created fresh at ship time, same migrations applied | Ship day |

- Prod is created with `supabase db push` (or pasting the migration files in
  order). It starts 100% clean — test data never touches prod.
- Per-project dashboard settings are **not** carried by migrations and must be
  re-set on prod: Signups OFF, Site URL + redirect URLs, email templates, SMTP.
- The `invite-user` Edge Function must be deployed to every project that uses
  invites (`supabase functions deploy invite-user`).
- Free tier caps at **2 projects** (staging + prod = exactly 2).

### 2.2 Frontend deployment

- **Localhost** — daily automated suite (`npm run dev`).
- **Cloudflare Pages** — client trial + smoke tests.
  - Custom domain now: `labelm.saibal.dev` (CNAME `labelm` → Pages project).
  - Changeable later with **zero code changes** (app uses `window.location.origin`;
    invite function uses the request `Origin` header).
  - Add `public/_redirects` → `/* /index.html 200` so SPA deep links work.
  - Env vars in CF dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
    `VITE_TRIAL_MODE=true`.

### 2.3 Env files

| File | Contains | Committed? |
|---|---|---|
| `.env` | Staging `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` | No (gitignored) |
| `.env.example` | Documented placeholder vars | Yes |
| `.env.staging` (later) | Staging keys for auth E2E | No |
| Service-role keys for seed/reset | Read from shell env, never in files | No |

---

## 3. Test Stack (libraries)

| Layer | Tool | Purpose |
|---|---|---|
| Unit + component | Vitest + React Testing Library + user-event + jsdom | Logic, slices, services, components |
| E2E | Playwright | Real-browser flows: nav, roles, filters, edge cases |
| DB rules (optional) | pgTAP via Supabase CLI | RLS / triggers / RPCs directly against Postgres |
| Seed + perf | Node/TS script + SQL | Realistic large datasets, latency checks |
| Coverage | `@vitest/coverage-v8` | Measure unit coverage |

---

## 4. Stage 0 — Test Infrastructure (do this first)

1. Install devDeps:
   - `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`,
     `@testing-library/user-event`, `@testing-library/jest-dom`, `@playwright/test`
2. Add `vitest.config.ts` (jsdom env, `@` alias, `src/test/setup.ts`).
3. Add `src/test/setup.ts` (jest-dom matchers, RTL cleanup).
4. Add `playwright.config.ts`:
   - `baseURL` from env (default `http://localhost:5173`, override for CF smoke).
   - `webServer` boots `npm run dev` automatically.
   - Projects: `setup` (auth storage states per role) + `chromium`.
5. Add npm scripts to `package.json`:
   - `test` → `vitest run`
   - `test:watch` → `vitest`
   - `test:coverage` → `vitest run --coverage`
   - `test:e2e` → `playwright test`
6. Verify: `npm run test` (0 tests, exits 0) and `npx playwright install chromium`.

---

## 5. Stage 1 — Core Testing (no SMTP, trial mode) ⏳ CURRENT

### 5.1 Unit tests (Vitest)

| File | What's covered |
|---|---|
| `src/lib/__tests__/format.test.ts` | `formatCurrency`, `formatCurrencyWhole`, `formatDate`, `formatDateTime`, `todayInputValue` |
| `src/lib/__tests__/period.test.ts` | `monthBounds` (exclusive `to`), `monthLabel`, `monthRangeLabel`, `rangeLabel`, `isValidRange`, leap year / month-end edges |
| `src/lib/__tests__/roles.test.ts` | `hasRole` rank matrix, `initialsOf` |
| `src/store/slices/__tests__/authSlice.test.ts` | status/role transitions, `bootstrap`, `restricted`, `clearAuth` |
| `src/store/slices/__tests__/draftSlice.test.ts` | `setDraft` merge, `selectCustomer`, `resetDraft` |
| `src/services/__tests__/labels.test.ts` | filter builder → SQL mapping, `round2`, `toLabel` mapper, list pagination params |
| `src/services/__tests__/invoices.test.ts` | `buildListQuery` filter mapping, `toInvoice` (paid/due/status), line-item sort, mapper |
| `src/services/__tests__/customers.test.ts` | `currentRateOf` (open vs latest), create/update/soft-delete behavior |
| `src/services/__tests__/auth.test.ts` | service wrappers map to correct supabase calls (mock `@/lib/supabase`) |

Services are tested with `vi.mock('@/lib/supabase')` — no network, no DB.

### 5.2 Component tests (Vitest + RTL)

| Component | What's covered |
|---|---|
| `RequireAuth` / `RequireRole` | redirect to `/login` with `from`; `/unauthorized` for wrong role; loader state |
| `LabelEditDialog` | renders for editable label; **locked/disabled for billed labels** |
| Filter sheet (dashboard) | preset apply/toggle (unprinted, high-weight, 48h), reset all, active-count badge |
| `PaymentDialog` | validation: amount > due rejected, negative/zero rejected, mode required |
| Login page (trial mode) | magic-link / forgot-password buttons show "available in final delivery" toast instead of calling email flows |

### 5.3 E2E (Playwright) — core flows

Specs under `e2e/`:

| Spec | Covers |
|---|---|
| `auth-basic.spec.ts` | Login success/wrong password, logged-out redirect with `from`, logout, suspended → `/unauthorized`, staff blocked from `/team` + `/invoice/new`, trial-mode toasts |
| `navigation.spec.ts` | Every route, back buttons, catch-all `*` → `/`, `RequireAuth`/`RequireRole` gating |
| `labels.spec.ts` | Create → preview → print → status changes → edit → **billed label locked** |
| `invoices.spec.ts` | Wizard (3 steps), bulk generate, record/edit/delete payment, status recalc (Unpaid→Partial→Paid), overdue filter |
| `filters.spec.ts` | Dashboard + invoice filter/sort/pagination matrices: each dimension, combined, empty results, page clamp, sort orders, presets |
| `customers.spec.ts` | CRUD, rate change, soft-delete/restore, empty state |
| `dues.spec.ts` | Aggregation, search, sort, expand rows, record-payment link |
| `team-stub.spec.ts` | Team page shows coming-soon in trial mode (no real invites) |
| `roles.spec.ts` | Owner/admin/staff capability matrix from `authPlan.md` (11 capabilities) |

Auth setup: create test users via the **Auth admin API** (service role) —
no emails. Playwright `storageState` reuses one logged-in session per role.

### 5.4 Large-data seed + performance

- `scripts/seed-data.ts` (service role) generates on **staging**:
  - ~40–60 customers (mix: some archived, some with no labels, varied rate history)
  - **12–15k labels** across 2–3 years (varied weights/amounts, draft + printed,
    some billed), including overlap + no-labels invoice edge cases
  - invoices + payments in every mode/status (incl. partial + overpay cases)
  - members in every role/status (owner/admin/staff, invited/suspended/active)
- Perf pass:
  - Measure dashboard + invoice list load/filter/pagination latency at this volume.
  - `EXPLAIN ANALYZE` the hot filter queries; confirm index usage.
  - Candidate missing indexes: `labels(customer_id)`, `labels(label_date)`,
    `labels(status)`, `invoices(period_start)`, `invoices(status)`,
    `invoices(due_date)`.

### 5.5 Trial-mode checks

- [ ] Login page keeps forgot-password / magic-link buttons visible
- [ ] Clicking them shows the "available in final delivery" toast (no network call)
- [ ] `/team` route → coming-soon screen
- [ ] Settings "Team & roles" link → coming-soon
- [ ] All core flows work with a single owner account

---

## 6. Stage 2 — Full Auth + SMTP + Functions ⏳ LATER

Deferred on purpose. Nothing in Stage 1 changes; this only **adds** on top.

### 6.1 Prerequisites

- Purchase/verify a sending domain in Zoho (you need your **own** domain for
  Zoho SMTP; `@zohomail.com` won't work). Can reuse `saibal.dev` as sender for
  staging, swap to the client's domain at ship.
- Configure SMTP on **staging** (Supabase Auth → SMTP Settings) + enable email
  confirmation, rate limits, URL config for the test origin.
- Deploy `invite-user` function to staging (`supabase link` + `supabase functions deploy invite-user`).

### 6.2 Auth E2E (staging only)

| Flow | Covers |
|---|---|
| Magic link | request → email received → click → logged in; expired/invalid token |
| Forgot password | request → reset email → set new password → strength meter → login |
| Accept invite | invite email → accept page → name + password → member active |
| Team management | invite staff/admin, resend, revoke, promote/demote, suspend/reactivate, remove; owner-only ops (promote admin, transfer ownership, purge) |
| Invite-user function | validation, role gating, duplicate/resend, cleanup on failure |

### 6.3 Flip to full auth on prod

1. Confirm staging auth E2E is green.
2. Configure SMTP + URL config + templates on **prod**.
3. Deploy `invite-user` to prod.
4. Set `VITE_TRIAL_MODE=false` in Cloudflare Pages, redeploy.
5. Smoke-test full auth on the deployed prod URL.

---

## 7. Delivery / Ship (runbook)

1. Create the **prod** Supabase project.
2. Apply migrations in order (`supabase db push` or paste SQL files).
3. Re-set per-project Auth settings (signups OFF, Site URL, redirects, templates).
4. Run `seed-first-owner.sql` with the client's email + fresh password.
5. Deploy `invite-user` to prod.
6. Set prod env vars in Cloudflare Pages; add `public/_redirects`.
7. Point `labelm.saibal.dev` (now) / client domain (later) at the Pages project.
8. Run the **smoke E2E suite** against the deployed URL (baseURL override).
9. Keep staging for any future destructive testing.

---

## 8. Edge-Case Matrix (checklist)

### Auth & access
- [ ] Login: correct password, wrong password, unknown email
- [ ] Logged-out visit to protected route → `/login` with `from` preserved
- [ ] Suspended member → `/unauthorized`
- [ ] Staff blocked from `/team` and `/invoice/new`
- [ ] Logout clears session + query cache
- [ ] Trial mode: forgot/magic-link → coming-soon toast (Stage 1)
- [ ] Magic link expiry / reset token expiry / invite token reuse (Stage 2)

### Labels
- [ ] Create validation: date, customer, rate, weight required
- [ ] `amount = round2(weight × rate)` — decimals, half-up rounding
- [ ] Edit allowed only while uninvoiced; **billed label locked** (UI + DB trigger)
- [ ] Print flips `draft` → `printed`; print queue stat matches draft count
- [ ] SL No uniqueness under concurrent creation (`next_document_number`)
- [ ] Pagination: reset to page 1 on filter/sort change; clamp past last page
- [ ] Zero-weight / zero-amount labels

### Filters & sort
- [ ] Each filter alone + combined with others
- [ ] Empty results state + "reset all"
- [ ] Date ranges: `from > to`, `from == to`, boundary inclusivity (half-open `to`)
- [ ] Min > max amounts/weights; negative values; non-numeric input
- [ ] Search special chars: `%`, `_`, quotes, spaces (`ilike` behavior)
- [ ] Presets toggle on/off (unprinted, high-weight >5kg, last 48h)
- [ ] Every sort key, asc + desc, stable id tiebreak
- [ ] Custom range vs monthly vs all-time

### Invoices
- [ ] Single + bulk generation
- [ ] Skipped reasons: `overlap`, `no_labels`
- [ ] Overlap detection with half-open `daterange`
- [ ] `due_date` = chosen payment terms (issue date + N, custom, or `current_date + 30` fallback)
- [ ] Status recalc on payment insert/update/delete (Unpaid / Partial / Paid)
- [ ] Payment amount > due rejected; negative/zero rejected
- [ ] Every payment mode (cash / upi / bank_transfer / cheque)
- [ ] Delete payment → status recalcs upward
- [ ] Customer with zero unbilled labels in period
- [ ] Bulk with a mix of created + skipped customers

### Customers
- [ ] CRUD; soft-delete hides from lists; restore works
- [ ] Delete customer that has labels/invoices (FK behavior)
- [ ] Rate history: open price vs latest-price resolution (`currentRateOf`)
- [ ] Rate change reflected in label amount preview

### Dues
- [ ] Per-customer aggregation, oldest days overdue, overdue flag
- [ ] Client-side search + sort (highest due / oldest / name)
- [ ] Record-payment deep link → invoice details

### Numbers & counters
- [ ] `next_document_number` concurrency (`SELECT … FOR UPDATE`)

### Large data / perf
- [ ] 12–15k labels: dashboard filter latency, pagination, stat RPCs
- [ ] `EXPLAIN ANALYZE` on hot filter queries; index coverage

### Misc / stubs
- [ ] Settings toggles / export / print-again / share → toasts, no crash
- [ ] Empty states on every page (no labels, no customers, no invoices, no dues)

---

## 9. Daily Workflow (how to run)

```bash
# Unit + component (fast, no DB)
npm run test
npm run test:watch

# Coverage
npm run test:coverage

# E2E against localhost + staging Supabase
npm run dev          # terminal 1
npm run test:e2e     # terminal 2

# E2E against the deployed Cloudflare URL (smoke)
E2E_BASE_URL=https://labelm.saibal.dev npm run test:e2e

# Interactive browser for writing a new spec
npx playwright codegen http://localhost:5173

# Seed large data on staging (service role)
SUPABASE_PROJECT_URL=... SUPABASE_SERVICE_ROLE_KEY=... tsx scripts/seed-data.ts

# Reset staging test data (keep client owner account)
psql "$DATABASE_URL_STAGING" -f scripts/reset-db.sql
```

---

## 10. Open Items (tracked)

- [ ] `company_settings` table — planned in `authPlan.md`, not yet in migrations
- [ ] Stage 2: Zoho SMTP setup + domain verification on staging
- [ ] Stage 2: deploy `invite-user` to staging + prod
- [ ] Per-project Auth URL config on both staging and prod
- [ ] Confirm free-tier project cap (staging + prod = 2)