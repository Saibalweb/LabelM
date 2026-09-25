# Bulk Print — Implementation Plan

Status: **Planned** (not built yet)
Entry point: Dashboard multi-select
Selection scope: Current page only (loaded 25 rows)
Print/status behavior: Billed labels not selectable (locked). Already-printed unbilled labels may be reprinted, status stays `printed`. Drafts flip to `printed` after print.

---

## 1. Shared label card + print helper (refactor, no behavior change)

- New `src/components/labels/LabelPrintCard.tsx` — extract the 60×40mm label markup currently inline in `src/pages/preview.tsx:144-172` (customer name, SL No, date, weight, amount).
- New `src/lib/printLabel.ts` — owns the print CSS (moved from `src/pages/preview.tsx:16-91`) plus a `runLabelPrint(areaId)` helper: inject style → `window.print()` → cleanup on `afterprint`. Generalized to support multiple sheets via `.label-sheet { page-break-after: always; }`.
- Refactor `preview.tsx` to use `LabelPrintCard` + `runLabelPrint('printLabel')`. Single-label behavior must be unchanged.

## 2. Service + RPC for status flip

- New migration `supabase/migrations/XXXX_mark_labels_printed.sql`:
  - `mark_labels_printed(p_ids int[])` — SECURITY DEFINER, `is_active_member()` guard (mirrors existing labels RLS).
  - `update labels set status = 'printed' where id = any(p_ids) and invoice_id is null and status = 'draft'`
  - `invoice_id is null` sidesteps the billed-lock trigger (`20260917023949_labels.sql:62-79`); `status = 'draft'` avoids pointless writes. Return affected count.
  - Grant to `authenticated`, revoke from `public, anon`.
  - One atomic call instead of N PATCHes.
- `src/services/labels.ts` — add `markPrinted(ids: number[])` via `supabase.rpc('mark_labels_printed', { p_ids: ids })`.
- `src/hooks/queries.ts` — add `useBulkMarkPrinted()` with `invalidateQueries(labels)` on success (pattern at `queries.ts:140-146`).

## 3. Dashboard selection UI (`src/pages/dashboard.tsx`)

- Add a narrow checkbox column to the row grid (native checkbox, matching the filter-sheet style already in this file).
- Billed rows (`label.invoiceId != null`): checkbox disabled + lock tooltip — not selectable.
- New state `selectedIds: Set<number>`; header "select all on page" checkbox.
- Bulk action bar — appears when selection > 0: "Print N selected" button + clear. Placed above/below the list.

## 4. Bulk print flow

- `handleBulkPrint()`: render a hidden `#bulkPrintArea` containing one `LabelPrintCard` per selected label (each wrapped in `.label-sheet`), call `runLabelPrint('bulkPrintArea')`, remove area on `afterprint`, then fire `useBulkMarkPrinted(selectedIds)` and toast.
- Dashboard rows already carry every field the card needs (`Label` type), so no extra fetch.

## 5. Tests

- **Unit** — `src/services/__tests__/labels.test.ts`: `markPrinted` passes `p_ids` to the RPC (mirror existing `update` test at lines 298-309).
- **E2E** — new `e2e/bulkPrint.spec.ts` (reuse `stubPrint`, `addCustomer`, `createLabel` helpers from `e2e/helpers.ts`): create 2 labels → dashboard → select both → Print Selected → assert RPC fired and both flip to printed; assert a billed label's checkbox is disabled.

## Out of scope / notes

- Selection is page-local; "print whole unprinted queue" can be a follow-up (needs server-side ID fetch).
- Thermal-roll sheet behavior depends on the printer driver; e2e verifies N sheets in the Chromium print preview only.