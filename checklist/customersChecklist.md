# Customers Checklist — Customers (`/customers`)

Reviewed & fixed on 2026-09-26.

Covers the **Customers management page**: search, add/edit modal, edit-rate modal, and pagination.

---

## 1. Search bar — moved out of the top nav, server-side by name AND id

| # | Item | Status |
|---|------|--------|
| 1 | Removed the top-nav search input (`TopNav searchable`) and the mobile search bar (`MobileSearchBar`) from the Customers page | Done |
| 2 | Added an inline search bar below the page header, styled like Invoices / Labels / Dues (rounded `p-4` card, `h-12` input, search icon, clear "X" button) — but **without the Filter button** (unnecessary for this page) | Done |
| 3 | Search is **server-side**: the term is debounced (300 ms) and sent as `CustomerFilters.query` → `customerService.listPage` → PostgREST | Done |
| 4 | Non-numeric queries match customer **name** via `ilike('%q%')` | Done |
| 5 | Numeric queries match customer **ID** by prefix using integer ranges (`id.gte/id.lt`, clamped to `INT4_MAX`) — same logic as the Create-page picker | Done |
| 6 | No-match search → inline row "No customers match your search." (no hero snap, no crash) | Verified |
| 7 | A **Loading… overlay** appears over the table while a search refetch is in flight | Done |
| 8 | Clearing the search returns to the full list once the refetch lands | Verified |
| 9 | Search only affects the active-customers table; the "Deleted customers" admin section is untouched | Confirmed |

**Verdict: FIXED** — search lives in the content area like the other list pages, and is a real
PostgREST filter (name OR id-prefix), matching the pattern used on Invoices / Labels / Dues.

---

## 2. Add / Edit Customer modal — spacing, typography, mobile

| # | Item | Status |
|---|------|--------|
| 1 | Dialog widened to `sm:max-w-lg` (was `sm:max-w-md`) with more breathing room | Done |
| 2 | Inputs upgraded to `h-12` with clear typography (`font-body-md`), previously the small default `h-8` inputs | Done |
| 3 | Field labels now follow the label scale: `font-label-md text-label-md text-on-surface-variant` | Done |
| 4 | Dialog title follows headline scale: `font-headline-md text-headline-md` | Done |
| 5 | Phone + Email are now side-by-side on `sm+`, Address + GST side-by-side on `sm+`, Name and Rate full width — reduces vertical scrolling and feels less cramped | Done |
| 6 | Required indicator (`Name *` in destructive red) makes the one required field obvious | Done |
| 7 | Error message uses `font-body-sm text-body-sm text-destructive` | Done |
| 8 | Rate field keeps the `₹` prefix and `font-mono` on GST; all inputs share a consistent `inputClasses` constant | Done |
| 9 | Mobile: dialogs render `max-w-[calc(100%-2rem)]` (full-width minus 2rem) and the two-column fields collapse to one column below `sm` | Verified |

**Verdict: FIXED** — the form is now spacious, correctly typed, and responsive on small screens.

---

## 3. Edit Rate modal — spacing, typography, emphasis

| # | Item | Status |
|---|------|--------|
| 1 | Dialog widened to `sm:max-w-md` (was `sm:max-w-sm`) | Done |
| 2 | Added a customer identity card at the top: ID chip + name + **current rate** (`font-body-md`/`font-label-sm`), so the user sees who they are editing and the existing value | Done |
| 3 | Rate input upgraded to `h-12`, `font-body-md`, with the `₹` prefix left-aligned and `pl-9` | Done |
| 4 | Label follows `font-label-md text-label-md text-on-surface-variant`; title follows `font-headline-md` | Done |
| 5 | Helper text explains what the rate is used for: "charged per gram on every new label for …" | Done |
| 6 | Save button includes a pencil icon for a stronger primary affordance | Done |
| 7 | Mobile: dialog full-width minus 2rem, identity card truncates long names | Verified |

**Verdict: FIXED** — the modal highlights the important information (customer, current rate, new rate) and is no longer cramped.

---

## 4. Pagination — server-side, does not affect other pages

| # | Item | Status |
|---|------|--------|
| 1 | Previously the page fetched **all** customers at once (`customerService.list()` with no limit) — confirmed | Done |
| 2 | New `customerService.listPage(filters, params)` returns `{ data, total }` using PostgREST `count: 'exact'` + `.range()` | Done |
| 3 | New hook `useCustomerListQuery` (`['customers','list',filters,page,pageSize]`) with `keepPreviousData` | Done |
| 4 | **Impact check:** the new paginated path is used **only** by the Customers page. `useCustomersQuery` (the full-list query) is untouched, so Invoices, Dues, Labels/Dashboard, Create-Invoice and the Label edit dialog — which all still need the full customer list for their dropdowns/filters — are **not affected** | Verified |
| 5 | Pagination footer: "Showing X–Y of Z", `Page N / M`, previous/next buttons (disabled at bounds, disabled while fetching) | Done |
| 6 | Page resets to 1 when the search/filter changes; clamps back if the last page shrinks | Done |
| 7 | Page 1 after a new search shows the loading overlay; pagination changes show "Loading…" in the footer | Done |
| 8 | `PAGE_SIZE = 25`, same as Invoices / Labels | Done |

**Verdict: SAFE** — pagination is isolated to the Customers page via a dedicated hook + service
method; every other page keeps the full-list `useCustomersQuery` and is unaffected.

---

## 5. Filter-sheet customer multi-selects still fetch the full list (accepted)

Other pages (Invoices, Dues, Labels/Dashboard filter sheets; Create Invoice single-select;
Label edit `<select>`) still use `useCustomersQuery` → `customerService.list()`, which fetches
**all** customers (with embedded price history, no limit). The multi-select in the three filter
sheets resolves `selectedCustomerChips` from this full list.

| # | Item | Status |
|---|------|--------|
| 1 | Full-list fetch confirmed on the 3 filter sheets (invoices, dues, dashboard), Create Invoice, and Label edit dialog | Confirmed |
| 2 | **Decision (2026-09-26): KEEP as-is** — at ~200–300 customers the payload (~100–300 KB) and ~300 rows in a `max-h-36` scroll box are fine; client-side name/id filtering stays instant | Confirmed |
| 3 | Realistic breaking point is **~1,000+ customers**; revisit only if the client grows past that | Note |
| 4 | **Migration path if needed:** debounced server-side search (`customerService.search`, name + numeric-ID prefix, small `LIMIT`) in the sheets, plus a separate `id → customer` cache so selected chips still resolve without the full list; easiest wins are the two single-selects (Create Invoice, Label edit) | TODO — only when scale demands |
| 5 | Customers page itself is **already** server-side paginated + searchable (this checklist §1, §4) and does not rely on the full-list fetch | Confirmed |

**Verdict: ACCEPTED** — the full-list fetch on filter sheets is intentional for now; a server-side
search migration is documented here as the future work item.

---

## Verification

- [x] Unit tests: **229 passed** (incl. new `customerService.listPage` coverage + updated Customers-page component tests)
- [x] `tsc -b` clean
- [x] `oxlint` clean (no new warnings; the `set-state-in-effect` warning in `CustomerFormDialog` is the same pre-existing pattern as `LabelEditDialog`)
- [x] Production build succeeds
- [ ] E2E `customers.spec.ts` updated for the new placeholder ("Search name or ID...") and server-side search — run against hosted Supabase

**Files changed:**
- `src/pages/customers.tsx` — inline search, server-side search + loading overlay, pagination, improved Edit Rate modal
- `src/components/customers/CustomerFormDialog.tsx` — redesigned add/edit modal (spacing, typography, responsive)
- `src/services/customers.ts` — `customerService.listPage` (server-side search by name/id + pagination)
- `src/hooks/queries.ts` — `useCustomerListQuery`
- `src/lib/types.ts` — `CustomerFilters`, `CustomerListParams`, `CustomerListResult`
- `src/pages/__tests__/customers.test.tsx`, `src/services/__tests__/customers.test.ts` — tests
- `e2e/customers.spec.ts` — updated search placeholder + server-side search flow
- `checklist/customersChecklist.md` — this file