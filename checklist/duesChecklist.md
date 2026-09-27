# Dues Checklist — Dues (`/dues`) + Payment flow

Reviewed & fixed on 2026-09-26.

Covers the **Dues Overview page** (stats, filters, search) and the **payment flow**.
The payment section physically lives on the **Invoice page** (`src/pages/invoiceDetails.tsx`),
not on the Dues page — the Dues "Record Payment" button only navigates to that invoice.
The payment flow requirements are tracked here for convenience (see §4).

---

## 1. Heading stats (Total Outstanding | Customers with Dues | Oldest Due) — server-side or fake data?

| # | Item | Status |
|---|------|--------|
| 1 | The three stat cards are rendered in `src/pages/dues.tsx` (`StatCard`) from the `duesCustomers` aggregation | Confirmed |
| 2 | Data source is **real**: `useDueInvoicesQuery` → `invoiceService.listDue` → PostgREST on `invoices` (Unpaid/Partial), payments embedded to compute `paid`/`due` | Confirmed |
| 3 | `Total Outstanding` = Σ `customer.totalDue`; `Customers with Dues` = grouped customer count; `Oldest Due` = max `oldestDays` — all computed **client-side** over the server-fetched rows, **not fake/static** | Confirmed |
| 4 | No seeded/hard-coded numbers anywhere; an empty DB shows 0 across all three cards | Verified |
| 5 | **Caveat:** because stats aggregate the current query result, applying a filter (e.g. one customer) makes the stats reflect only that filtered set — expected behaviour | Confirmed |

**Verdict: REAL DATA, client-side aggregation** — numbers come from the DB via the service layer; only the grouping/sum is done in the browser. No fake data.

---

## 2. Filtering accuracy (quick views, aging, status, customer, amount, due window)

Filtering is **two-tier by design** (see `src/pages/dues.tsx` + `invoiceService.listDue` in `src/services/invoices.ts`):

- **Server-side (PostgREST `WHERE`)** — payment status, customer ids, due-date window (`due_date`), and search. Always scoped to `status IN ('Unpaid','Partial')` (≡ `due > 0`, since `due` is derived and not a stored column).
- **Client-side (post-aggregation)** — the two filters that only exist *after* grouping: **aging buckets** (per-customer `overdueDays`) and the **due amount range** (per-customer `totalDue`). Quick-view presets are also evaluated client-side against today's date.

| # | Item | Status |
|---|------|--------|
| 1 | Quick views — All Dues / Overdue / Due Soon (≤7d) / Due 30+ days — toggle via `preset`; count in the active badge | Done |
| 2 | Aging — Overdue 1–30 / 31–60 / 60+ days (based on today's date, not the display reference) — checkbox multi-select | Done |
| 3 | Payment status (Unpaid / Partial) — server-side `in('status', …)` | Done |
| 4 | Customer & Account multi-select + search + removable chips — server-side `in('customer_id', …)` | Done |
| 5 | Due Amount Range (min/max on per-customer total due) — client-side over the aggregation | Done |
| 6 | Due Date Window — All Time / Overdue / This Month / Custom range — server-side `gte/lt` on `due_date` | Done |
| 7 | Active-count badge on the Filters button + "N active" in the sheet header | Done |
| 8 | Reset All clears every dimension (incl. sort back to default) | Done |

| # | Combination check | Status |
|---|-------------------|--------|
| 1 | Overdue + aging 31–60 → only customers whose oldest invoice is 31–60 days past due | Verify against seed data |
| 2 | Payment status Partial + one customer → server returns only that customer's Partial invoices; total due reflects only those | Verify against seed data |
| 3 | Amount range + Due window (This Month) → amount narrows the already window-filtered customers | Verify against seed data |
| 4 | Quick view Due Soon + status Unpaid → both predicates AND-ed, no empty/incorrect row set | Verify against seed data |
| 5 | Every dimension + Reset All → returns to the full unfiltered list | Verify against seed data |

**Verdict: FIXED / verified by unit tests** — `duesFilters.test.tsx` covers sheet open, presets toggle, aging/status/customer/amount/window active counts, actual list narrowing, and Reset All. Seed-data combination checks (rows above) still pending manual pass.

---

## 3. Search — SSR or CSR? Accurate results?

| # | Item | Status |
|---|------|--------|
| 1 | App is a **Vite SPA — no SSR/SSR rendering**; all data arrives via React Query from Supabase | Confirmed |
| 2 | The Dues search input is **debounced (300 ms)** and the term is sent **server-side**: `invoice_number.ilike.%q%` OR `customer_id.in.(…resolved ids…)` in `invoiceService.listDue` | Done |
| 3 | Search matches customer **name** (resolved to ids) and invoice **number** — matches the placeholder "Search customer or invoice..." | Done |
| 4 | The same term is also applied client-side for instant narrowing while the debounced fetch is in flight (no stale full list flash) | Done |
| 5 | No-match search → "No customers match your search or filters." (no crash, no hero snap) | Verified |
| 6 | Clearing the search instantly returns to the filtered list once the refetch lands | Verified |

**Verdict: CSR app, SERVER-SIDE search** — the query is a real PostgREST filter (accurate), with a client-side fast-path for immediacy. No SSR involved.

---

## 4. Payment flow — lives on the Invoice page

The payment UI (`PaymentDialog`, "Record Payment" / "Payment History") is implemented in
`src/pages/invoiceDetails.tsx`. The Dues page only links to it (`navigate('/invoice/<id>')`).
The payment flow requirements below are tracked **here** so payment UX and Dues collection stay in one place.

| # | Requirement | Status |
|---|-------------|--------|
| 1 | **Max amount clamp** — client cannot exceed the remaining due: number input has `max={maxAmount}` and save-time validation rejects `value > maxAmount` ("Amount cannot exceed the due amount…"); edit mode allows `dueAmount + current payment` | Done |
| 2 | **Payment date defaults to today** — `todayInputValue()` on open and on reset | Already OK (kept) |
| 3 | **Payment mode defaults to Cash** — default switched from `bank_transfer` to `cash` | Done |
| 4 | **Amount input starts empty** — no pre-fill; the employee types the amount | Done |
| 5 | **"Pay full remaining" checkbox** under the Amount input — checking it fills the amount with the remaining due (`maxAmount`) and **disables the input** (employees can only type once unchecked); unchecking re-enables the field and keeps the typed amount; only shown for new payments (not edit) | Done |

| # | TODO / follow-up | Status |
|---|------------------|--------|
| 1 | Make the default payment mode **configurable in Settings** (per-account default instead of hard-coded Cash) | TODO — later |
| 2 | Live seed-data pass for the §2 combination matrix (rows 1–5) | TODO — later |
| 3 | E2E: record a second payment via "Pay full remaining" and confirm the invoice flips to Paid | TODO — later |

## 5. Filter sidebar — typography/spacing + Quick Views selected state

| # | Item | Status |
|---|------|--------|
| 1 | Filter sheet restyled to the refined reference (13px sans option text, 11px mono section labels, bordered option rows/inputs, normalised spacing, 420px width) | Done |
| 2 | "Quick Views" active pill now renders **solid primary blue** instead of a grey background | Done |
| 3 | Root cause: the active style used `bg-primary-fixed`, a colour token not defined in `index.css`, so no background ever rendered — switched to `bg-primary text-on-primary` | Root-caused |
| 4 | "N active" badge switched from the undefined `bg-primary-fixed` to the defined `bg-primary-fixed-dim` | Done |
| 5 | Same treatment applied to the Invoices and Dashboard/Labels filter sheets for consistency | Done |

**Verdict: FIXED** — Quick Views selection is now unmistakably blue, matching the other selected controls (segmented duration buttons). Verified live via headless screenshots.

## 6. Due-date integration (variable due dates from generation) + "Oldest Due" fix

Due dates are now chosen per invoice at generation time (On Receipt / Net 15 / Net 30 / Custom),
so the dues page sees arbitrary, non-uniform due dates. This section records how the page turns
those into the three overview cards and the filters, and the bug that surfaced.

### How the three overview cards are calculated

| Card | Formula | Scope |
|------|---------|-------|
| Total Outstanding | Σ over customers of Σ `invoice.due` (invoices with `due > 0`) | Server-filtered set (`duesCustomers`) |
| Customers with Dues | `duesCustomers.length`; footnote = count of customers with any invoice past due | Server-filtered set |
| Oldest Due | max over customers of `today − dueDate` in days (clamped ≥ 0) | Server-filtered set |

- `due` = `total_amount − Σ payments` (derived at read time; there is no stored `due` column).
- The cards aggregate `duesCustomers` (the server-filtered rows), so **only server-side filters
  change them** — search, payment status, customer ids, due-date window. Client-side filters
  (quick-view preset, aging, amount range) narrow the visible list but **not** the cards.

### Filtering tiers

| Tier | Filters |
|------|---------|
| Server (PostgREST `WHERE`) | status `IN (Unpaid, Partial)`, `customer_id.in`, `due_date >= from`, `due_date < to`, search (invoice no / resolved customer name) |
| Client (post-grouping) | quick-view presets (today-based), aging buckets (today-based `oldestDays`), due amount range (per-customer `totalDue`) |

### Bug found & fixed — "Oldest Due" / "currently overdue" used the wrong reference

`daysOverdue` was computed against `referenceNow` = the **latest due date in the result set**
(a leftover from the original mock-data prototype), while aging used today's date. With uniform
`period_end + 30` due dates the difference was easy to miss; with user-selected due dates it
produced wrong numbers — e.g. a single invoice 40 days past due showed **Oldest Due = 0 days** and
was **not** counted as overdue.

Fix (`src/pages/dues.tsx`): removed `referenceNow`; `daysOverdue`, `oldestDays`, and the `overdue`
flag are now all measured from **today**, matching the aging filter and the Overdue quick view.
`overdueDays` was folded into `oldestDays`. Added `data-testid` on the three card values
(`stat-total-outstanding`, `stat-customers-with-dues`, `stat-oldest-due`) for stable assertions.

### Real-data verification

Automated by `e2e/dues-due-dates.spec.ts`. Creates one customer with three invoices via the
generation RPC — ₹100 each, due **today−40**, **today+3**, **today+45** — then scopes the page to
that customer with the server-side search and asserts:

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | Total Outstanding (scoped) | ₹300 | Pass |
| 2 | Customers with Dues | 1 | Pass |
| 3 | Oldest Due | 40 days (today-based) | Pass |
| 4 | "1 currently overdue" footnote | visible | Pass |
| 5 | Quick views Overdue / Due Soon / Due 30+ | row visible for each | Pass |
| 6 | Aging 31–60 | row visible | Pass |
| 7 | Aging 1–30 | no match | Pass |
| 8 | Due window = Overdue (server-side) | Total Outstanding → ₹100, Oldest Due → 40 days | Pass |

**Verdict: FIXED** — the dues overview now reflects variable due dates correctly, and every
day-count on the page (card, aging, presets) is consistently today-based.

## Verification

- [x] Unit tests: **234 passed**
- [x] e2e (Playwright, live hosted Supabase): **34 passed**
- [x] `tsc -b` clean
- [x] `oxlint` clean (no new warnings)
- [x] Production build succeeds

**Files changed:**
- `src/pages/dues.tsx` — filter sheet (quick views, aging, status, customer, amount, due window, sort) + server/client two-tier filtering; §5 restyle + Quick Views active state; §6 today-based `oldestDays`/`overdue` fix + card `data-testid`s
- `src/services/invoices.ts` — `invoiceService.listDue` (server-side dues query)
- `src/hooks/queries.ts` — `useDueInvoicesQuery`
- `src/lib/types.ts` — `DuePreset`, `DueAgingBucket`, `DueWindow`, `DueFilters`
- `src/pages/invoiceDetails.tsx` — payment flow: max clamp, empty amount default, cash default, "Pay full remaining" checkbox
- `src/pages/__tests__/duesFilters.test.tsx`, `src/pages/__tests__/paymentDialog.test.tsx`, `src/services/__tests__/invoices.test.ts` — tests
- `e2e/dues.spec.ts` — filter sheet + sort-in-sheet e2e coverage
- `e2e/dues-due-dates.spec.ts` — §6 real-data due-date integration coverage
- `e2e/helpers.ts` — shared Supabase REST setup helpers (customer/label/invoice)
- `checklist/duesChecklist.md` — this file