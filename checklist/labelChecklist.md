# Label Checklist — Create Label page + Labels/Dashboard

Covers the **Create Label (`/create`)** flow and the **Labels/Dashboard** list + filters.
Reviewed & fixed on 2026-09-25 (sections 1–8); seed data + filter verification on 2026-09-26 (section 9).

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
| 1 | Date field removed from the main entry row (was tab-stop #2) and moved into the Summary card | Done |
| 2 | Left card no longer stretches — the empty gap under the weight field is gone; weight is a prominent quick-entry with a live Amount readout | Done |
| 3 | **Date is removed from the tab order** (`tabIndex={-1}`) but still selectable with the mouse | Done |
| 4 | Tab flow is **customer search → dropdown results (focusable, Enter selects) → weight → Generate**; helper buttons (clear X, rate alerts) are skipped | Done |
| 5 | Date still defaults to today's date automatically | Already OK |

**Verdict: FIXED** — entry is a fast "type number → Tab → type weight → Tab → Generate" flow; the dropdown stays open while tabbing and closes only when focus leaves the widget.

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

## 8. Customer lifecycle: owner/admin-only delete + hidden history + restore (approved plan, implemented)

| # | Item | Status |
|---|------|--------|
| 1 | `soft_delete_customer(p_customer_id)` RPC — **owner/admin only** (`is_active_member() + get_my_role() in ('owner','admin')`) | Done |
| 2 | **History hidden**: `labels_select`, `invoices_select`, `invoice_payments_select` now require the customer's `deleted_at IS NULL` — labels, invoices, payments **and unpaid dues** of a deleted customer are invisible to everyone (data preserved) | Done |
| 3 | `list_deleted_customers()` RPC (owner/admin) + `restore_customer()` RPC (owner/admin) | Done |
| 4 | **Defense in depth**: `customers_update` `with check` now requires `deleted_at is null` (no plain-table soft-delete); `customers_delete` gated to owner/admin | Done |
| 5 | **UI**: danger delete — row menu Delete is owner/admin only (staff never see it); clicking it opens a red confirmation modal with ⚠️ warning + full consequence list + "only an owner/admin can restore" note | Done |
| 6 | **UI**: "Deleted customers" admin section (owner/admin) with deleted-by/deleted-on + Restore button | Done |
| 7 | `authPlan.md` updated (permission matrix: staff ✗ on customer delete; RLS strategy documented) | Done |
| 8 | Unit + component tests (service RPCs, staff no-delete, danger modal, restore) | Done |
| 9 | e2e rewrite: delete → confirm modal → archived → restore → active (robust, no flaky count-0) | Done |

**Verdict: IMPLEMENTED — PENDING MIGRATION APPLY.** Apply both migrations to the hosted project for the new behavior + e2e to take effect:
- `supabase/migrations/20260925210000_customer_soft_delete_rpc.sql`
- `supabase/migrations/20260925220000_customer_history_hide_restore.sql`

Run `npx supabase db push` (or paste the SQL into the dashboard SQL editor). Until then, `soft_delete_customer` returns `PGRST202 (function not found)` and the delete/restore e2e test fails — everything else is green.

---

## 9. Seed data across dates/months + filter accuracy verification

The dashboard previously showed every label dated today (by design). To exercise the
date/month/status/billing/amount/customer filters, realistic seed data was written to the
**real hosted DB** using existing active customers.

| # | Item | Status |
|---|------|--------|
| 1 | **Seeded 300 labels** spread across 10 months (2025-12 → 2026-09), 30 per month, using **161 existing customers** | Done |
| 2 | SL numbers allocated through the real `next_document_number` counter (LBL-0453 → LBL-0745) — no collision with app-generated numbers | Done |
| 3 | Status mix: 39 draft / 261 printed | Done |
| 4 | **5 invoices created** (INV-0057 → INV-0061) for 5 anchor customers across Jan/Mar/May/Jul/Sep 2026, each marked **Paid** via a full payment — 30 labels billed, so the billing filter is meaningful and Dues is not polluted | Done |
| 5 | **Filter accuracy verified against the raw dataset**: every one of 18 filter cases returned exactly the rows the filter semantics dictate (id sets + totals matched) | Verified |
| 6 | Filter cases covered: all, single-month (2025-12 / 2026-09), Q1 range, presets (today / this month), one customer, status (draft/printed), billing (billed/unbilled), weight min/max, amount min, search by SL-number substring, search by customer name, and combos (billed+printed+range, unbilled+min amount) | Verified |
| 7 | Existing dashboard filter + dues e2e still pass with the seeded data | Verified |

**Verdict: SEEDED + FILTERS ACCURATE** — the dashboard now shows realistic labels across
months/customers and every filter (date ranges, presets, status, billing, weight, amount,
search) returns the correct rows. Seed data is intentionally left in place; to remove it,
delete the labels with `sl_no` between `LBL-0453` and `LBL-0745` and their invoices/payments.

---

## 10. Dashboard filter sidebar — typography/spacing + preset selected state

| # | Item | Status |
|---|------|--------|
| 1 | Filter sheet restyled to the refined reference (13px sans option text, 11px mono section labels, bordered option rows/inputs, normalised spacing, 420px width) | Done |
| 2 | "Saved Filter Presets" active pill now renders **solid primary blue** instead of a grey background | Done |
| 3 | Root cause: the active style used `bg-primary-fixed`, a colour token not defined in `index.css`, so no background ever rendered — switched to `bg-primary text-on-primary` | Root-caused |
| 4 | "N active" badge switched from the undefined `bg-primary-fixed` to the defined `bg-primary-fixed-dim` | Done |
| 5 | Same treatment applied to the Invoices and Dues filter sheets for consistency | Done |

**Verdict: FIXED** — saved-preset selection is now unmistakably blue, matching the other selected controls (segmented duration buttons). Verified live via headless screenshots.

## 11. Dashboard label row — redesign, direct print, role-gated actions, billed status

| # | Item | Status |
|---|------|--------|
| 1 | **UI overlap fixed + columns aligned** — the amount and the action icons no longer collide, and the Date/Amount/Actions columns line up across every row. Each row is its own grid, so content-sized `auto` columns drifted per row; switched to fixed tracks `lg:grid-cols-[6rem_minmax(0,1fr)_8rem_8rem_6rem]` / `xl:grid-cols-[7rem_minmax(0,1fr)_9rem_9rem_7rem]` with `gap-x-6`/`xl:gap-x-10` and `py-5` rows. Date is left-aligned under its header; Amount and Actions are right-aligned. | Done |
| 2 | **Row layout** — SL No + **Billed/Unbilled** status pill (left); customer **avatar showing the customer `#id`** + name + rate chip; Date/Time; Amount; Actions. | Done |
| 3 | **Avatar colour follows status** — green (`bg-secondary-container`) for **Billed**, peach (`bg-tertiary-container`) for **Unbilled**, matching the status pill. | Done |
| 4 | **Actions simplified** — the redundant Eye/view button was removed (the whole row is clickable to preview). Actions are now **Print** + a vertical **⋮ actions menu**. | Done |
| 5 | **Actions always visible** — Print + ⋮ are shown at all times (removed the `lg:opacity-0` hover-reveal that hid the whole actions cell while the menu was open). Clicking ⋮ only toggles the menu; clicks inside the actions cell stop propagation so they never trigger row navigation. | Done |
| 6 | **⋮ actions menu** (`DropdownMenu`) — for an **unbilled** label: **Edit Label** + **Delete Label** (destructive). For a **billed** label: a disabled **Invoiced — Locked** item. The menu is shown to every role. | Done |
| 7 | **Responsive** — the 5-column table starts at `lg` (the sidebar eats 256px from `md`, so the table cannot fit at `md`); mobile/tablet keep the stacked label/value card layout. Verified with real screenshots at 390 / 820 / 1440px. | Done |
| 8 | **Edge cases** — very long customer names truncate (`minmax(0,1fr)` + `min-w-0` + `truncate`) and large amounts (`₹1,23,45,678.90`) fit the fixed Amount track without pushing neighbours; covered by a unit test. | Done |
| 9 | **Direct print** — the printer icon prints that label immediately (no trip to the preview page). Extracted the 60×40mm markup to `src/components/labels/LabelPrintCard.tsx` and the print CSS/flow to `src/lib/printDocument.ts` (`runLabelPrint(areaId)`), shared with the preview page. A hidden `#printLabel` area is rendered on demand and revealed only for print. Draft labels flip to `printed` after printing. | Done |
| 10 | **Delete for unbilled labels** — available to **all roles** (owner/admin/staff) for uninvoiced labels only; opens a red confirmation dialog. Billed rows never expose delete (the menu shows a locked item). Enforced at the DB by the `labels_lock_billed_delete` trigger; no extra migration needed. | Done |
| 11 | Preview page refactored to reuse `LabelPrintCard` + `runLabelPrint` (single-label behavior unchanged); fixed the pre-existing `height: 100% !importantf` typo in the print CSS. | Done |
| 12 | Unit tests: `src/pages/__tests__/dashboardLabelActions.test.tsx` covers the avatar/id/badge layout, avatar status colour, always-visible buttons, absence of the eye button, the ⋮ menu (edit/delete/locked), staff visibility, the delete confirm flow, and direct print. | Done |

**Verdict: FIXED + IMPLEMENTED.** Staff can edit and delete **unbilled** labels too; billed labels stay locked for everyone (billed-lock triggers). No new migration required.

## Verification

- [x] Unit tests: **229 passed** (incl. service RPC tests + customers-page component tests)
- [x] E2E tests: **29 passed** (incl. customer delete→archive→restore, create-label flow, filters, dues)
- [x] `oxlint` clean (no new warnings)
- [x] `tsc -b` clean
- [x] Production build succeeds

**Files changed (section 10):**
- `src/pages/dashboard.tsx` — filter sidebar restyle + "Saved Filter Presets" active state + active badge token
- `src/pages/invoices.tsx`, `src/pages/dues.tsx` — same filter sidebar treatment for consistency

**Follow-up notes:**
- `e2e/helpers.ts` `selectCustomerById()` fills the number, waits for the search result button, and clicks it (manual selection).
- Known pre-existing flake (not from these changes): the label edit flow can briefly match `₹1,000.00` in both the print label and the closing dialog — fixed by scoping to `#printLabel`.
- Deleted customer history is fully preserved in the DB; restoring brings everything back.