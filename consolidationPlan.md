# Code Consolidation Plan

Goal: move repeated code snippets into a single, predictable home so future
development and debugging touch one place instead of many. This document tracks
the batches, what has landed, and the known risks.

## Target structure

```
src/lib/               pure functions & constants (no React)
src/hooks/             reusable React hooks
src/components/ui/     primitives (Button, Input, Avatar, StatusPill, ...)
src/components/shared/ app-composed blocks (FilterSheet, PageHeader, StatCard, ...)
src/services/          Supabase query plumbing + per-entity services
```

Existing conventions already in use: `lib/format.ts`, `lib/period.ts`,
`lib/roles.ts`, `lib/styles.ts`, `lib/pagination.ts`, `hooks/useDebouncedValue.ts`,
`components/ui/avatar.tsx`, `components/ui/status-pill.tsx`.

---

## Batch A — pure lib helpers (COMPLETED)

Mechanical, no visual change, covered by unit tests.

| Item | Result |
| --- | --- |
| `formatAmount` (2-decimal, no `₹`) | Added to `src/lib/format.ts`; replaced 4 copies of `toAmount` in `lib/documentPdf.ts`, `pages/createInvoice.tsx`, `components/invoices/BulkInvoiceDialog.tsx`, `components/invoices/InvoicePrintCard.tsx`. |
| `todayISO` | Added to `src/lib/format.ts`; removed 5 local copies (`services/invoices.ts`, `services/prices.ts`, `lib/documentPdf.ts`, `pages/dues.tsx`, `pages/create.tsx`). Behavior kept UTC — see Risk 1. |
| `round2` | Added to `src/lib/format.ts`; removed copies in `services/labels.ts`, `components/labels/LabelEditDialog.tsx`. |
| `parseOptionalNumber` | Added to `src/lib/format.ts`; replaced `value !== '' ? parseFloat(value) : null` in `pages/dashboard.tsx`, `pages/invoices.tsx`, `pages/dues.tsx`. |
| `monthLabel` / `rangeLabel` | Removed local copies from `services/invoices.ts`; now imported from `src/lib/period.ts`. |

Tests: added coverage for the new helpers in `src/lib/__tests__/format.test.ts`.
Status: `tsc -b` clean, lint clean, 329 tests passing.

### Reverted during Batch A (intentionally NOT extracted)

The following were implemented and then reverted at the maintainer's request;
the inline forms are to be kept as-is:

- `assertOk(error)` helper for the 44 `if (error) throw new Error(error.message)` blocks.
- `getErrorMessage(err, fallback)` helper for the 15 `err instanceof Error ? err.message : fallback` sites.
- `lib/messages.ts` toast-string constants.

Do not re-attempt these unless the maintainer asks.

---

## Batch B — pagination, panel, search, badges (PLANNED)

| # | Snippet | Occurrences | Current locations (indicative) | Target |
| --- | --- | --- | --- | --- |
| 1 | Pagination math + footer UI | 3 functional + 2 static | `pages/dashboard.tsx`, `pages/customers.tsx`, `pages/invoices.tsx`; static variants in `pages/dues.tsx`, `pages/team.tsx` | `lib/pagination.ts` (`pageRange`, `pageBounds`) + `components/shared/table-pagination.tsx` |
| 2 | Card/panel container `rounded-xl border border-outline-variant bg-surface-container-lowest` | 31 | pages, settings, dialogs, print cards | `components/ui/panel.tsx` (or re-theme `ui/card.tsx`) |
| 3 | Search input with leading icon (+ optional clear) | 12 | list pages, `layout/TopNav.tsx`, filter sheets, comboboxes | `components/ui/search-input.tsx` |
| 4 | Status/role/member badges | ~10 sites | `pages/dues.tsx`, `pages/team.tsx`, `pages/dashboard.tsx`, `pages/settings.tsx`, `layout/TopNav.tsx` | `components/ui/status-badge.tsx` + `components/shared/role-badge.tsx` |

Notes:
- The three functional pagination blocks are effectively byte-identical; only
  the reset dependency list differs (`[filters]` vs `[filters, sortBy]`).
- `dues.tsx` / `team.tsx` render disabled pagers — a shared component must
  support a disabled/non-interactive mode.
- `StatusPill` already exists; a generic `StatusBadge` with `tone` should wrap it
  rather than replace it.

---

## Batch C — filter sheet refactor (PLANNED, largest)

The right-side filter drawer is duplicated across three pages (~700 LOC total,
near byte-identical scaffolding):

- `pages/dashboard.tsx` (sheet ~919–1339)
- `pages/invoices.tsx` (sheet ~717–1032)
- `pages/dues.tsx` (sheet ~658–1013)

Identical pieces: `SheetContent` class string, header (icon tile + title +
active-count badge + description + close), section dividers, and the
`Reset All` / `Apply Filters` footer with result-count pill.

| # | Snippet | Occurrences | Target |
| --- | --- | --- | --- |
| 1 | Filter sheet scaffold | 3 | `components/shared/filter-sheet.tsx` (`FilterSheet`, `FilterSheetHeader`, `FilterSheetFooter`, `FilterSheetSection`) |
| 2 | Checkbox option row (dot + label) | 6 | `components/shared/filter-controls.tsx` |
| 3 | Min/Max numeric range inputs | 8 | `components/shared/filter-controls.tsx` |
| 4 | Section micro-header (icon + uppercase label) | 19 | `components/ui/section-label.tsx` |
| 5 | Section divider `h-px w-full bg-outline-variant/60` | 20 | `components/ui/divider.tsx` |
| 6 | Filter trigger button with count badge | 3 identical | `components/shared/filter-button.tsx` |
| 7 | Filter toolbar card (search + pill group + Filters) | 3 + 1 variant | `components/shared/filter-toolbar.tsx` |
| 8 | Customer multi-select filter block | 3 near-identical + 1 variant | `components/shared/customer-filter-picker.tsx` + `useCustomerFilter` |
| 9 | Segmented pill/button groups | 9 groups | `components/ui/segmented-control.tsx` |
| 10 | Duration/timeframe group + custom date range | 3 | `components/shared/date-range-filter.tsx` |

Do this page-by-page, keeping the sheet open and verifying no visual diff.

---

## Batch D — remaining components & hooks (PLANNED)

| # | Snippet | Occurrences | Target |
| --- | --- | --- | --- |
| 1 | `PageHeader` (title/subtitle/actions/eyebrow) | 9 pages | `components/shared/page-header.tsx` |
| 2 | `StatCard` | 3 local copies | `components/shared/stat-card.tsx` |
| 3 | `ConfirmDialog` (destructive AlertDialog) | 5 | `components/shared/confirm-dialog.tsx` |
| 4 | `FormField` (label + control + error/hint) | ~17 | `components/ui/form-field.tsx` |
| 5 | `Alert` banner (error/warning/info) | ~10 | `components/ui/alert.tsx` |
| 6 | `TableCard` + `TableHead` + `TableSkeleton`/`LoadingPill` | 7/7/5 | `components/shared/data-table.tsx`, `components/ui/loading.tsx` |
| 7 | `BulkActionBar` | 2 identical | `components/shared/bulk-action-bar.tsx` |
| 8 | `CustomerCombobox` / `CustomerFilterList` | 2 + 3 identical | `components/shared/customer-*.tsx` |
| 9 | `DialogHeaderWithIcon` / `IconTile` | 4+ | `components/ui/` |
| 10 | `PasswordStrength` + checklist | 2 | `components/shared/password-strength.tsx` |
| 11 | `usePagination`, `useSelection`, `useFilterState` | 5/2/3 | `src/hooks/` |
| 12 | Supabase query helpers (`sanitizeTerm`, `resolveSearchIds`, `firstOrSelf`, `pageRange`) | 2–3 each | `services/queryHelpers.ts` |
| 13 | PDF/print export try-catch-toast wrapper | 5 | `hooks/useDocumentExport.ts` |
| 14 | `timeAgo` move to `lib/format.ts` | 1 | `src/lib/format.ts` |

---

## Risks

### Risk 1 — `todayISO` (UTC) vs `todayInputValue` (local)

`src/lib/format.ts` now exposes both:

- `todayInputValue()` (line ~47) subtracts the timezone offset → user's local date.
- `todayISO()` (line ~54) uses `new Date().toISOString().slice(0, 10)` → UTC date.

For IST (UTC+5:30) between **00:00 and 05:29 local**, UTC is still the previous
day, so `todayISO()` returns yesterday. The app currently disagrees with itself:

| Local (`todayInputValue`) | UTC (`todayISO`) |
| --- | --- |
| `createInvoice.tsx` | `create.tsx` (default label date) |
| `invoiceDetails.tsx` (payment date) | `dues.tsx` (overdue window `to:`) |
| `BulkInvoiceDialog.tsx` | `services/invoices.ts` (`.lt('due_date', ...)`) |
| | `services/prices.ts` (price `effective_from`) |
| | `documentPdf.ts` (filename date, cosmetic) |

Impact: wrong pre-filled dates, aging-bucket boundaries off by one day, and
price/rate history boundaries landing a day early. Silent and time-of-day
dependent — hard to reproduce in dev.

Resolution options:
1. Make `todayISO` local and remove the duplicate (recommended for a
   single-region IST app).
2. Keep both but rename to `todayLocal` / `todayUtc` and choose deliberately per
   call site.

Note: `services/__tests__/invoices.test.ts` re-implements the UTC version and
asserts it — update that test as part of the fix.

### Risk 2 — Label dimension constants defined twice

`DEFAULT_LABEL_WIDTH_MM = 60` / `DEFAULT_LABEL_HEIGHT_MM = 40` live in both:

- `src/lib/labelPresets.ts` (lines ~13–14)
- `src/lib/printDocument.ts` (lines ~1–2)

Consumers are split: `services/settings.ts` imports from `labelPresets`;
`lib/documentPdf.ts` imports from `printDocument`; `printDocument.ts` uses its
own. Both are fallbacks for the same concept:

- `settings.ts` fallback = what the Settings UI shows when no DB row exists.
- `documentPdf.ts` fallback = what actually prints when options omit a size.

If one is changed and the other isn't, a fresh install can show one size in
Settings and print at another. No test asserts equality.

Resolution: make `labelPresets.ts` the single source (it already owns the
presets), and re-export from `printDocument.ts` for compatibility. Add a test
asserting both resolve to the same value.

### Risk 3 — Shared components exist but are bypassed

The danger is not missing components; it is that inline copies drift from the
shared ones. Evidence:

- **`EmptyState`** (`ui/empty-state.tsx`) used by `dashboard.tsx` and
  `customers.tsx`, but `invoices.tsx` hand-rolls the same dashed-border card with
  a second CTA and a permission-gated footer. Needs a secondary-action/footer
  slot before it can absorb that case.
- **`LoadingOverlay`** (`ui/loading-overlay.tsx`) used once
  (`createInvoice.tsx`). `customers.tsx` and `invoices.tsx` hand-roll
  `Loader2` + "Loading…" pills without the shared component's
  `role="status"` / `aria-live="polite"` — inconsistent UX and accessibility.
- **`SectionHeader`** (`settings/SectionHeader.tsx`) used in settings sections,
  but ~9 page headers hand-roll title/subtitle/action.
- **`StatusPill`** (`ui/status-pill.tsx`) covers invoices/dues/invoiceDetails,
  but `dues.tsx` still hand-rolls an "Overdue / Action Required" pill (its status
  is a boolean, not an `InvoiceStatus`, so `StatusPill` needs a generic tone).
- **`Avatar`** (`ui/avatar.tsx`) covers customers/dues/team/invoices, but
  `create.tsx`, `createInvoice.tsx`, `settings.tsx`, and `TopNav.tsx` still
  hand-roll avatar circles with different sizes/tones.

Resolution: extend the existing components minimally (EmptyState secondary
action, a `LoadingPill`, generic `StatusPill`/`StatusBadge` tone, Avatar sizes),
then substitute inline copies page-by-page, checking each for intentional
differences first. Add lint or review checks to discourage new inline copies.

---

## Recommended sequencing

1. Batch A — done.
2. Risk 2 — lowest risk, purely mechanical, add an equality test.
3. Risk 1 — decide local vs UTC, unify, update the invoices service test.
4. Batch B — pagination, panel, search, badges.
5. Batch C — filter sheet refactor (largest; do page-by-page).
6. Batch D — remaining components and hooks.
7. Risk 3 — route inline markup through existing components as the final pass.
