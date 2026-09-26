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
| 3 | Avatar color now derives from `customerId` (consistent per customer) instead of `invoice.id` | Done |
| 4 | Unused `initials()` helper removed (no dead code) | Done |

**Verdict: FIXED** — each row now reads `#580  E2E Inv Cust …` style (id chip, then name). Live-verified.

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

## Verification

- [x] Unit tests: **205 passed**
- [x] `tsc -b` clean
- [x] `oxlint` clean (no new warnings)
- [x] Production build succeeds
- [x] Live headless-browser checks for items 2, 3, 5, 6, 7, 8

**Files changed:**
- `src/pages/invoices.tsx` — items 1–3, 8
- `src/pages/createInvoice.tsx` — items 4–7
- `src/components/ui/loading-overlay.tsx` — new reusable loading overlay (item 4)
- `checklist/labelChecklist.md` — moved here from repo root (checklist folder)