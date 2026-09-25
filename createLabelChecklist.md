# Create Label Page — Fix Checklist

Page: **Create Label (`/create`)** — reviewed & fixed on 2026-09-25.

---

## 1. Disable Generate when the selected customer has no rate

| # | Item | Status |
|---|------|--------|
| 1 | `Generate Label` button is disabled when a customer without a rate is selected | Done |
| 2 | Button shows a clear visual change (red/destructive tint + border, stays fully visible while disabled) | Done |
| 3 | Red alert shown on/around the button: "Rate missing — set a rate to generate labels." | Done |
| 4 | Red alert shown under the selected customer, explaining the missing rate | Done |
| 5 | A "Set rate in Customers" / "Go to Customers" navigation button takes the user straight to the Customers page | Done |

**Verdict: FIXED** — the rate requirement is now surfaced at every point: under the customer card, around the generate button, and via a one-click jump to the Customers page.

---

## 2. Faster entry — customer and weight only (date moved out of the way)

| # | Item | Status |
|---|------|--------|
| 1 | Date field removed from the main entry row (was tab-stop #2) | Done |
| 2 | Date moved into the Summary card so it no longer interrupts the fill flow | Done |
| 3 | Tab order is now **customer → weight → date**, so the client can fill just the two key fields | Done |
| 4 | Date still defaults to today's date automatically | Already OK |

**Verdict: FIXED** — entry is now a straight "press number, type weight" flow; the date is only touched when it actually differs from today.

---

## 3. Customers no longer fetched all at once (server-side search)

| # | Item | Status |
|---|------|--------|
| 1 | Confirmed the old behaviour: the picker fetched the **entire** customers table up front (`customerService.list()` with no limit) and rendered every customer on focus | Confirmed bug |
| 2 | Create page now queries the server with a debounced search (number prefix or name contains) instead of loading all customers | Done |
| 3 | Focusing the field with an empty query no longer dumps every customer — it shows a "Type a customer number or name, then pick from the list." hint | Done |
| 4 | Selecting a customer is now **explicit** — the client picks from the search results; no auto-fill when typing a number | Done (per client request) |
| 5 | Numeric search matches the id prefix using integer ranges (`id.gte / id.lt`), since PostgREST cannot cast `id::text` inside a filter | Done |
| 6 | No-results state still offers "+ Add new customer" | Already OK |
| 7 | Customers page keeps the full list (it is a management table, not a picker) | Already OK |

**Verdict: FIXED** — the picker no longer pulls the whole table and no longer auto-fills on typing.

---

## 4. Clear (remove) customer button

| # | Item | Status |
|---|------|--------|
| 1 | Pressing the X button on the selected customer clears the card **and** the search field | Done |
| 2 | Root cause: the old auto-fill effect re-picked the customer from the query cache even after clearing (query stayed cached with the previous number) — auto-fill is removed, so the button now works | Done |
| 3 | E2E regression test added ("clear customer button resets the selection and the search number") | Done |

**Verdict: FIXED** — removing the auto-fill also removed the re-pick bug that kept the number in the search box.

---

## 5. Search speed

| # | Item | Status |
|---|------|--------|
| 1 | Dropped the second per-keystroke lookup (exact-id fetch for auto-fill) — search now fires a single query | Done |
| 2 | Debounce reduced from 200 ms → 150 ms | Done |
| 3 | Search dropdown resolves against the server with a small `LIMIT` (25) | Done |
| 4 | No unnecessary server call for empty / impossible queries (early return) | Done |

**Verdict: IMPROVED** — one request per keystroke instead of two; please re-test perceived speed. If it is still slow, the next lever is prefetching the top N recent customers to render instantly on focus.

---

## 6. Numeric id search crashed for short prefixes (int4 overflow) — FIXED

**Reported:** searching `2` / `21` in the customer search failed with
`{"code":"22003","message":"value \"3000000000\" is out of range for type integer"}`.

| # | Item | Status |
|---|------|--------|
| 1 | Root cause: `idPrefixRangeConditions("2")` generated `id.lt.3000000000` — only `lower` was guarded against the int4 max, the exclusive `upper` overflowed | Confirmed |
| 2 | Final range is now clamped to `id.lte.2147483647` when the exclusive bound would overflow int4 | Done |
| 3 | Unit test asserts exact conditions for `"2"` and verifies **every literal stays within int4 bounds for prefixes 1..200** | Done |
| 4 | **Live verification:** created 200 customers against the hosted Supabase, ran every numeric id search (all 200) + spot-checked `2`/`21` — all resolved, no overflow | Verified |
| 5 | All 200+ test customers created for verification were **hard-deleted** (cleanup complete) | Done |

**Verdict: FIXED** — numeric search now resolves for all real id prefixes.

---

## 7. Pre-existing bug discovered: "Delete customer" never actually deletes (RLS)

While cleaning up the test customers I found the app's soft-delete is **silently broken**:

| # | Item | Status |
|---|------|--------|
| 1 | Symptom: clicking "Delete customer" makes the row vanish in the UI, but the row is **never deleted server-side** (every "deleted" customer still has `deleted_at = null`) | Confirmed |
| 2 | Root cause: `UPDATE ... SET deleted_at` returns **403/42501 "new row violates row-level security policy"**. PostgREST's UPDATE read-back is subject to the `customers_select` policy (`deleted_at is null`), which can never pass for the just-soft-deleted row | Root-caused |
| 3 | The `customers.spec.ts` "soft-delete" assertion was a **false-pass flake** (it matched the table's loading/skeleton state during a refetch, not an actual deletion) | Confirmed |
| 4 | Fix prepared: `soft_delete_customer(int)` SECURITY DEFINER RPC (new migration `supabase/migrations/20260925210000_customer_soft_delete_rpc.sql`) + `customerService.remove()` now calls it | Done |
| 5 | Apply the migration to the hosted project for the fix to take effect: `npx supabase db push` (or run the SQL in the dashboard SQL editor) | **Pending — needs you to apply** |

**Verdict: FIX PREPARED, NOT YET ACTIVE** — the code + migration are ready; the migration must be applied to the hosted Supabase project. Until then, "deleted" customers keep accumulating (including the ~40 `E2E Cust`/`E2E Label Cust` rows left by the e2e runs, which were never actually deleted).

---

## Verification

- [x] Unit tests: **199 passed** (incl. `customerService.search` range tests + RPC soft-delete test)
- [x] E2E tests: **28 passed** (label create/print flow + clear-customer regression test)
- [x] `oxlint` clean (no new warnings)
- [x] `tsc -b` clean
- [x] Production build succeeds

**Follow-up notes:**
- `e2e/helpers.ts` `selectCustomerById()` now fills the number, waits for the search result button, and clicks it (manual selection).
- Known pre-existing flake (not from these changes): the label edit flow can briefly match `₹1,000.00` in both the print label and the closing dialog — passed on re-run.