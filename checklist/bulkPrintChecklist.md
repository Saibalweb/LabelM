# Bulk Print Checklist — Dashboard multi-select, print & PDF export

Covers the dashboard bulk selection, **Print N selected**, **Export PDF**, the
`mark_labels_printed` RPC, and the settings integration (label size, company
header, prefixes). Added 2026-09-28.

Related files:
- `src/pages/dashboard.tsx` — selection column, select-all, bulk action bar, hidden `#bulkPrintArea`
- `src/services/labels.ts` — `markPrinted`, `listAll`
- `supabase/migrations/20260928120000_company_settings_and_bulk_print.sql` — `mark_labels_printed`
- `src/lib/labelPdf.ts`, `src/lib/printLabel.ts` — size-aware PDF/print
- Tests: `src/pages/__tests__/dashboardBulk.test.tsx`, `src/services/__tests__/labels.test.ts`, `e2e/bulkPrint.spec.ts`, `e2e/bulkPrintStatus.spec.ts`

---

## 1. Selection UI

| # | Item | Status |
|---|------|--------|
| 1 | Leading checkbox column added to the label row grid and the header grid | Done |
| 2 | Header checkbox selects every row on the current page (page-local) | Done |
| 3 | Header checkbox shows an indeterminate state for a partial selection | Done |
| 4 | Checkbox clicks stop propagation and never trigger row navigation | Done |
| 5 | Selection is cleared when filters, sort, or page change (avoids stale ids) | Done |
| 6 | Billed labels **are selectable** (Option A) — for export and reprint | Done |
| 7 | Bulk action bar appears only when ≥1 row is selected, with `N selected`, Export PDF, Print N, Clear | Done |

## 2. Status-flip matrix — `mark_labels_printed` (server-authoritative)

The client sends **every selected id**; the RPC flips only `invoice_id is null AND status = 'draft'` and returns the affected count.

| # | Label state | invoice_id | status before | Expected after | Verified |
|---|-------------|-----------|---------------|----------------|----------|
| 1 | Unbilled draft | null | `draft` | `printed` (flips) | Unit + e2e |
| 2 | Unbilled, already printed (reprint) | null | `printed` | `printed` (no-op) | Unit + e2e |
| 3 | Billed (locked) | set | `printed` | `printed`, invoice_id unchanged | Unit + e2e |
| 4 | Billed but draft (theoretical) | set | `draft` | `draft` (invoice_id guard blocks it) | e2e |
| 5 | Mixed selection (draft + printed + billed) | mixed | mixed | only the draft flips; RPC returns 1 | Unit + e2e |
| 6 | Second run on the same ids (idempotent) | — | all `printed` | returns 0, no writes | e2e |
| 7 | Empty selection | — | — | no RPC call at all (client guard) | Unit |

**Return count drives the toast:** `count > 0` → "N label(s) marked printed"; `count === 0` → "No labels needed a status change" (e.g. all billed/already printed).

## 3. Bulk print flow

| # | Item | Status |
|---|------|--------|
| 1 | `handleBulkPrint` resolves selected labels from the current page rows | Done |
| 2 | Hidden `#bulkPrintArea` renders one `.label-sheet` + `LabelPrintCard` per selected label | Done |
| 3 | `runLabelPrint('bulkPrintArea', { widthMm, heightMm })` uses the configured size; one page per label | Done |
| 4 | Status flip runs on `afterprint` (after the print dialog closes) | Done |
| 5 | Area is removed and selection cleared after the print completes | Done |
| 6 | A cancelled print still flips status (browsers expose no success event) — documented behavior | Known |
| 7 | Reprinting a billed label prints it but changes no status | Done |

## 4. Bulk PDF export

| # | Item | Status |
|---|------|--------|
| 1 | Bulk action bar **Export PDF** exports the selected labels | Done |
| 2 | Header **Export PDF** exports the selection if any, else the full filtered set (`listAll`) | Done |
| 3 | Export **never** changes status and never calls `mark_labels_printed` | Unit + e2e |
| 4 | Billed labels are included in the export | Unit + e2e |
| 5 | One PDF page per label at the configured size (default 60×40mm) | Unit |
| 6 | Rupee sign is mapped to `Rs ` in the PDF (jsPDF Helvetica has no `₹` glyph) | Unit |
| 7 | Filenames: `label-<SL>.pdf` (single), `labels-<N>-<date>.pdf` (bulk) | Unit |
| 8 | Empty filtered set shows "No labels to export." instead of an empty file | Done |

## 5. Settings integration

| # | Item | Status |
|---|------|--------|
| 1 | Print/PDF use the configured label width/height (not the hardcoded 60×40) | Done |
| 2 | Label/PDF render only fields enabled in `label_options` | Unit |
| 3 | `label_prefix` from settings is used by `labelService.create` (fallback `LBL`) | Unit |
| 4 | `invoice_prefix` from settings is used by invoice generation (fallback `INV`) | Migration |
| 5 | Company name/phone/address on labels come from `company_profile` | Unit |

## 6. Verification

- [x] Unit tests: `dashboardBulk.test.tsx` (selection, billed selectable, mixed RPC ids, neutral toast, export no-flip), `labels.test.ts` (`markPrinted` rpc args, empty-list skip, error, `listAll`), `LabelPrintCard.test.tsx` (option-driven fields, label phone)
- [x] E2E specs added: `bulkPrint.spec.ts` (UI select → print → RPC; billed selectable) and `bulkPrintStatus.spec.ts` (status matrix rows 1–4, idempotency, export no-flip) — **run against a live Supabase env**
- [x] `oxlint` clean
- [x] `tsc -b` clean

**Notes / follow-ups:**
- Selection is page-local; "print the whole unprinted queue" (server-side id fetch) is out of scope.
- Thermal-roll sheet behavior depends on the printer driver; e2e only verifies the request/status, not the physical output.
