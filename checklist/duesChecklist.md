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

## Verification

- [x] Unit tests: **passed** (incl. new `paymentDialog` coverage: max clamp attribute, cash/today defaults, quick-fill button; `duesFilters` suite; `listDue` service filter mapping)
- [x] `tsc -b` clean
- [x] `oxlint` clean (no new warnings)
- [x] Production build succeeds

**Files changed:**
- `src/pages/dues.tsx` — filter sheet (quick views, aging, status, customer, amount, due window, sort) + server/client two-tier filtering
- `src/services/invoices.ts` — `invoiceService.listDue` (server-side dues query)
- `src/hooks/queries.ts` — `useDueInvoicesQuery`
- `src/lib/types.ts` — `DuePreset`, `DueAgingBucket`, `DueWindow`, `DueFilters`
- `src/pages/invoiceDetails.tsx` — payment flow: max clamp, empty amount default, cash default, "Pay full remaining" checkbox
- `src/pages/__tests__/duesFilters.test.tsx`, `src/pages/__tests__/paymentDialog.test.tsx`, `src/services/__tests__/invoices.test.ts` — tests
- `e2e/dues.spec.ts` — filter sheet + sort-in-sheet e2e coverage
- `checklist/duesChecklist.md` — this file