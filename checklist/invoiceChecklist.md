# Invoice Checklist — Invoices (`/invoice`) + Generate Invoice (`/invoice/new`)

Reviewed & fixed on 2026-09-26.

Covers the **Invoices list page** and the **Generate Invoice wizard**. All items were
verified live against the hosted Supabase via a headless browser, plus unit tests,
`tsc`, `oxlint`, and a production build.

---

## 1. Status pills (All | Unpaid | Partial | Paid | Overdue) — server-side or client-side?

| # | Item | Status |
|---|------|--------|
| 1 | Located the pill row: right side of the search bar in `src/pages/invoices.tsx` (`statusPills`, `handlePill`) | Confirmed |
| 2 | Pills write `statuses` + `overdue` into `InvoiceFilters`, which feed `useInvoiceListQuery` → `invoiceService.listPage` → PostgREST `buildListQuery` | Confirmed |
| 3 | Server-side: `filters.statuses` becomes `query.in('status', ...)`; `overdue` becomes `query.in('status', ['Unpaid','Partial']).lt('due_date', today)` | Confirmed |
| 4 | No client-side filtering of the results — the DB returns only matching rows | Confirmed |

**Verdict: SERVER-SIDE** — the pills are applied in the PostgREST query (`src/services/invoices.ts:204-220`), not filtered in the browser. No change required.

---

## 2. Customer avatar shows the customer ID instead of initials

| # | Item | Status |
|---|------|--------|
| 1 | Old: avatar circle rendered `initials(customerName)` (e.g. "JD") next to the customer name | Confirmed |
| 2 | New: the avatar circle now renders `#{customerId}` on the left side of the customer name | Done |
| 3 | Avatar color now derives from `invoice.status` (Paid / Unpaid / Partial) using the same status color code as the status pill | Done |
| 4 | Unused `initials()` helper removed (no dead code) | Done |

**Verdict: FIXED** — each row now reads `#580  E2E Inv Cust …` style (id chip, then name). Live-verified.

---

## 2b. Status color code on the left-side avatar (Paid / Unpaid / Partial)

| # | Item | Status |
|---|------|--------|
| 1 | Avatar previously used a rotating customer-id palette (`avatarStyles[id % len]`), not tied to payment state | Confirmed |
| 2 | Avatar now uses the same status color code as the status pill: `statusPillStyles[invoice.status]` | Done |
| 3 | Paid → `bg-secondary-container text-on-secondary-container`, Unpaid → `bg-destructive/10 text-destructive`, Partial → `bg-tertiary-container text-on-tertiary-container` | Done |
| 4 | Due column color unchanged (`text-destructive` when `due > 0`) | Confirmed |
| 5 | Status pill colors unchanged | Confirmed |
| 6 | Single source of truth: avatar reuses `statusPillStyles` — no duplicated color map | Done |

**Verdict: FIXED** — the left-side avatar now carries a meaningful per-status color code (green = Paid, red = Unpaid, amber = Partial), while Due and Status keep their previous colors.

---

## 3. Loading feedback after applying a filter

| # | Item | Status |
|---|------|--------|
| 1 | Confirmed the list uses `keepPreviousData` — after a filter/pill/search change the old rows stayed frozen with no loading feedback | Confirmed |
| 2 | Added a `Loading…` overlay (transparent `bg-surface-container-lowest/70` backdrop + spinner pill) over the table whenever a refetch is in flight after a filter change (`isFetching && !loading && page === 1`) | Done |
| 3 | Initial page load still uses the existing skeleton rows (unchanged) | Done |
| 4 | Pagination keeps the existing footer "Loading…" (page > 1) — no double indicator | Done |
| 5 | Overlay disappears once the fetch resolves | Verified |

**Verdict: FIXED** — filters, pills, and search now give immediate loading feedback instead of frozen rows.

---

## 4. Loading UI while generating invoices

| # | Item | Status |
|---|------|--------|
| 1 | Bulk ("Generate for All") flow: already had an in-dialog loading state — spinner + progress bar + current-customer label (`BulkInvoiceDialog` `step === 'generating'`), behind the dialog's transparent backdrop | Already OK |
| 2 | Single-customer "Generate Invoice" (wizard): only the button text changed to "Generating…" with no page-level feedback | Confirmed gap |
| 3 | Added a reusable `LoadingOverlay` (`src/components/ui/loading-overlay.tsx`) — fixed inset overlay, transparent backdrop (`bg-black/10` + subtle blur), centered spinner + "Generating invoice…" card | Done |
| 4 | Wizard now renders `LoadingOverlay` whenever `generating` is true; cleared in `finally` | Done |

**Verdict: FIXED** — bulk generation already had a backdrop + loading UI; the single-invoice wizard now gets a full transparent-backdrop loading overlay too.

---

## 5. Generate-invoice customer search: name AND id

| # | Item | Status |
|---|------|--------|
| 1 | Old: `filteredCustomers` only matched `name` and `email` — the placeholder says "Search customer by name or ID..." but ID search did nothing | Confirmed bug |
| 2 | New: filter also matches `String(customer.id).includes(q)` alongside name/email | Done |
| 3 | Live-verified: searching a customer's numeric id surfaces that customer even though the name doesn't contain the digits | Verified |
| 4 | Searching a non-existent id shows "No customers found." (no crash) | Verified |

**Verdict: FIXED** — the wizard now searches by customer ID, name, or email.

---

## 6. Calendar icon misalignment in the date selection (Generate page)

| # | Item | Status |
|---|------|--------|
| 1 | Root cause: in the **Monthly** mode the `monthRangeLabel` helper text (`<p>`) lived *inside* the `relative` container that anchors the calendar icon — the container grew taller than the input, so `top-1/2` pushed the icon below the input's center | Root-caused |
| 2 | Moved the helper text **outside** the `relative` wrapper so the icon centers against the input only | Done |
| 3 | Custom-range From/To inputs were already correct (helper text was already outside) | Confirmed |
| 4 | Measured live: icon center vs input center offset = `0.0px` | Verified |

**Verdict: FIXED** — the calendar icon is now perfectly vertically centered in the month selector.

---

## 7. No labels for a customer → Generate disabled + "no labels" state

| # | Item | Status |
|---|------|--------|
| 1 | Generate button already disabled when `selectedLabels.length === 0` (`canGenerate`) | Already OK |
| 2 | Distinguish "no labels exist for this customer" from "labels exist but none selected": added `noLabelsForCustomer` (customer + valid period chosen, labels query settled, zero labels returned) | Done |
| 3 | Confirm section now shows a specific message: "No labels found for this customer and billing period." instead of the generic "Select at least one label." | Done |
| 4 | Review Labels section shows a red/destructive alert — "No labels available" + "The Generate button is disabled." — when a customer has no uninvoiced labels | Done |
| 5 | While the labels query is still loading, a "Loading labels…" message is shown (no premature "no labels") | Done |
| 6 | Live-verified with a customer that has no labels: button disabled + alert visible | Verified |

**Verdict: FIXED** — no-labels customers get a clear disabled state and an explicit alert.

---

## 8. Fast-clear of the search input snaps the UI back to the empty hero

| # | Item | Status |
|---|------|--------|
| 1 | Confirmed the bug: clearing the search instantly set `query === ''`, so `hasNoInvoices` flipped true and swapped the whole page to the "No invoices yet" hero for ~300ms until the debounced refetch landed | Confirmed |
| 2 | Root cause: `hasNoInvoices` read the raw `query` while the server was still filtering on the stale `debouncedQuery` | Root-caused |
| 3 | Fix: `hasNoInvoices` now uses `debouncedQuery.trim() === ''` — while the debounce/refetch is pending the table keeps showing the in-line "No invoices match your filters." fallback, then returns to the full list | Done |
| 4 | Live-verified: after filling a no-match query and clearing instantly, the hero does **not** appear; the table's no-results fallback shows, then the full list returns | Verified |
| 5 | The "No invoices yet" hero still appears when the DB is genuinely empty (no query, no filters) | Verified |

**Verdict: FIXED** — no more jarring snap to the empty hero when clearing the search quickly.

---

## 9. Concurrent invoice generation — how conflicts are managed

**Short explanation** (for testers/developers): invoice generation is entirely server-side in
`generate_invoice_for_customer` / `generate_invoices_for_period` (`supabase/migrations/20260922120000_invoices_generate.sql`),
one atomic transaction per call. Two employees generating for the same customer + same period are
serialized by three layers:

1. **Counters row lock** (`next_document_number`, `supabase/migrations/20260920130000_counters.sql`) —
   `INSERT ... ON CONFLICT DO UPDATE` locks the `invoice` counters row; the lock is held until the
   whole transaction commits, so the second caller blocks at the number-allocation step until the
   first employee's entire invoice is committed. Invoice numbers stay unique.
2. **Unique index** `invoices_customer_period_uniq (customer_id, period_start, period_end)` — once the
   first invoice is committed, the second insert for the same customer + period is rejected with
   SQLSTATE 23505, aborting that employee's transaction (nothing is created).
3. **Label protection** — the labels `UPDATE` only touches `invoice_id IS NULL` rows and the
   `labels_lock_billed` trigger blocks re-billing, so a label can never land on two invoices.

**Known edge cases / risks:**
- Two employees generating for the **same customer but overlapping different periods** (e.g. Jan 1–31
  vs Jan 15–Feb 15) can race past the overlap check (plain read, no lock); the unique index doesn't
  fire (different bounds), so the second invoice can be created with a **stale/inflated amount snapshot**.
- **Bulk generation is all-or-nothing**: `generate_invoices_for_period` loops customers with no
  per-customer `BEGIN/EXCEPTION`. A concurrent unique-violation on any customer aborts and rolls back
  the **entire** bulk run, not just that customer.
- UX: the concurrent loser in the same-period case surfaces as a generic "Failed to generate invoice."
  toast rather than the friendly "already has an invoice for this period" message (the `skipped='overlap'`
  path only catches already-committed overlaps).

| # | Item | Status |
|---|------|--------|
| 1 | Two employees, same customer + same period, concurrent → exactly one invoice, loser gets error toast, no duplicate labels | TODO — test later |
| 2 | Two employees, same customer + overlapping different periods, concurrent → verify second invoice's total_amount vs line items | TODO — test later |
| 3 | Concurrent bulk generation same period → confirm whole second run rolls back cleanly (no partial invoices) | TODO — test later |
| 4 | Sequential overlap (invoice already committed) → `skipped='overlap'` message shown, only that customer skipped | TODO — test later |

## 10. Filter sidebar — typography, spacing & selected-state polish

The right-side filter sheet was restyled to match the refined reference design; the same
treatment was applied to the Dues and Dashboard/Labels filter sheets for consistency.

| # | Item | Status |
|---|------|--------|
| 1 | Header retuned — title 17px semibold, description 13px (was 20px/16px), icon tile 36px, close button 32px | Done |
| 2 | Section labels now a tighter 11px mono uppercase; option/value text switched from the mismatched `font-headline-md text-label-sm` (Hanken 12px + label tracking) to `font-sans` 13px | Done |
| 3 | Option rows, search, amount/date inputs and the sort select now share a bordered rounded shell with a subtle focus ring | Done |
| 4 | Spacing normalised (px-5/py-4 header, space-y-5 body, lighter dividers); customer list taller (max-h-44); footer compacted | Done |
| 5 | Panel width normalised to 420px on every page | Done |
| 6 | "N active" badge switched from the undefined `bg-primary-fixed` token to the defined `bg-primary-fixed-dim` | Done |

**Verdict: FIXED** — filter sheet typography/spacing is consistent across Invoices, Dues and Dashboard/Labels. (Selected preset pills + their root cause are documented in the Dues §5 / Labels §10 checklists.)

## 11. Due date selection during invoice generation (single + bulk)

Previously the due date was hardcoded server-side as `period_end + 30` and the wizard only
printed the literal `Due Net 30`. The due date is now selected at generation time and persisted.

**Model:** anchored on the **generation (issue) date**, independent of the billing period.
Presets: `On Receipt (today)` · `Net 15` · `Net 30 (default)` · `Custom` (free date picker).
A null `p_due_date` falls back to `current_date + 30`. No range guard (a due date may precede
the period start when back-billing or invoicing a future-dated period).

| # | Item | Status |
|---|------|--------|
| 1 | Migration `20260927120000_invoice_due_date.sql` drops the old 3-arg / 2-arg RPCs and recreates them with `p_due_date` | Done |
| 2 | `generate_invoice_for_customer` stores `coalesce(p_due_date, current_date + 30)` | Done |
| 3 | `generate_invoices_for_period` passes one `p_due_date` through to every invoice in the run | Done |
| 4 | Old signatures removed — calling the 3-arg / 2-arg forms returns `PGRST202` (verified against hosted Supabase) | Verified |
| 5 | Shared `DueDateSelect` component (presets + custom date + live "Due …" preview) used by the wizard and bulk dialog | Done |
| 6 | Wizard Confirm panel shows the real selected date instead of "Due Net 30" | Done |
| 7 | Bulk dialog preview header shows the due date; Preview disabled until a date is chosen | Done |

### Combination matrix (real data, live against hosted Supabase)

Automated by `e2e/invoice-due-date.spec.ts` (4 tests). Each case creates a real customer + label(s),
generates through the UI, then reads the invoice's `Due Date:` value.

| # | Flow | Term | Expected due date | Result |
|---|------|------|-------------------|--------|
| 1 | Single wizard | Net 30 (default) | today + 30 | Pass |
| 2 | Single wizard | Net 15 | today + 15 | Pass |
| 3 | Single wizard | On Receipt | today | Pass |
| 4 | Single wizard | Custom (today + 90) | picked date | Pass |
| 5 | Single wizard | Custom (today − 30) | picked date; shows under **Overdue** pill | Pass |
| 6 | Single wizard | Net 15 | Confirm panel previews `Due <date>` before generating | Pass |
| 7 | Bulk (all customers) | Custom (today + 45) | picked date on every generated invoice | Pass |
| 8 | RPC direct | `p_due_date = null` | stored `current_date + 30` (fallback) | Pass |

**Verdict: DONE** — due date is selectable in both flows, persists correctly, drives the Overdue
filter, and the null fallback preserves the old default shape.

**Downstream — Dues page:** variable due dates flow into `/dues` (Total Outstanding, Customers with
Dues, Oldest Due, and the Overdue/Due Soon/Due 30+ presets, aging, and due-date window). Verifying
this surfaced a pre-existing bug where "Oldest Due"/"currently overdue" were measured against the
latest due date in the result set instead of today. Fixed and covered by
`e2e/dues-due-dates.spec.ts` — see `checklist/duesChecklist.md` §6.

## Verification

- [x] Unit tests: **234 passed**
- [x] e2e (Playwright, live hosted Supabase): **34 passed**
- [x] `tsc -b` clean
- [x] `oxlint` clean (no new warnings)
- [x] Production build succeeds

**Files changed:**
- `src/pages/invoices.tsx` — items 1–3, 8, 2b (status color code on avatar), 10 (filter sidebar restyle + active badge token)
- `src/pages/createInvoice.tsx` — items 4–7; §11 (due-date presets + confirm-panel date)
- `src/components/ui/loading-overlay.tsx` — new reusable loading overlay (item 4)
- `checklist/labelChecklist.md` — moved here from repo root (checklist folder)
- `src/components/invoices/DueDateSelect.tsx` — §11 shared due-date selector (new)
- `src/components/invoices/BulkInvoiceDialog.tsx` — §11 due-date control + preview
- `src/services/invoices.ts`, `src/hooks/queries.ts` — §11 `dueDate` threaded to `p_due_date`
- `src/lib/period.ts` — §11 `addDays`, `DueTerms`, `dueDateForTerms`
- `supabase/migrations/20260927120000_invoice_due_date.sql` — §11 RPC migration
- `e2e/invoice-due-date.spec.ts` — §11 combination matrix (new)
- `e2e/helpers.ts` — `addCustomer` now searches after create (customers list paginates 25/page)

### Pre-existing e2e drift fixed alongside §11

These were already broken before this work (unrelated to due dates) and are noted here for traceability:

| Spec | Issue | Fix |
|------|-------|-----|
| `filters.spec.ts`, `invoices.spec.ts` | Dashboard search placeholder renamed to `Search customer or SL No..` | Updated selector |
| `dues.spec.ts` | Empty-state text changed to `No customers match your search or filters.`; filter sheet leaves `main` `aria-hidden` | Updated text; close sheet + re-scope after Reset All |
| `auth-basic.spec.ts` | `Customers` heading exists twice (banner + main) → strict-mode violation | Scoped to `main` |
| `invoices.spec.ts` | Bulk test reused the wizard test's customer name → 2 rows matched once `addCustomer` searched | Added unique `bulkCustName` |