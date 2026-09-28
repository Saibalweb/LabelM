# Settings Checklist — Company details, label printing & document content

Covers the workspace settings added 2026-09-28: **company profile**, **label
size/printing**, **numbering prefixes**, and the **label/invoice content
toggles**. Related migration:
`supabase/migrations/20260928120000_company_settings_and_bulk_print.sql`.

Related files:
- `src/services/settings.ts`, `src/hooks/queries.ts` (`useCompanyProfileQuery`, `useAppSettingsQuery`)
- `src/components/settings/CompanyDetailsSection.tsx`, `LabelPrintingSection.tsx`
- `src/lib/labelPresets.ts`, `src/lib/documentOptions.ts`
- `src/pages/settings.tsx`, `src/pages/invoiceDetails.tsx`
- Tests: `src/services/__tests__/settings.test.ts`, `src/lib/__tests__/labelPresets.test.ts`, `src/lib/__tests__/documentOptions.test.ts`, `src/lib/__tests__/documentPdf.test.ts`, `src/components/labels/__tests__/LabelPrintCard.test.tsx`

---

## 1. Company profile (`company_profile`, singleton)

| # | Item | Status |
|---|------|--------|
| 1 | Fields: name (required), tagline, contact person, address (multiline), email, website, GSTIN, logo URL (nullable) | Done |
| 2 | Stored as a singleton row (`id = 1`) | Done |
| 3 | Readable by any active member; editable by owner/admin only | Done |
| 4 | `company_name` replaces the hardcoded "My Company Name" on labels | Done |
| 5 | Company header (name/tagline/address/GST/phones/email/website/contact) replaces the hardcoded "LabelMaster" on invoices | Done |
| 6 | Logo upload is deferred (column exists; needs a Storage bucket) | Deferred |

## 2. Phone model (`phones jsonb`)

| # | Item | Status |
|---|------|--------|
| 1 | Each entry: `{ id, label, value, showOnLabel, showOnInvoice }` | Done |
| 2 | `showOnLabel` is **exclusive** (radio) — at most one number is flagged for the label | Done |
| 3 | `showOnInvoice` is **multi** (checkbox) — several numbers may show on an invoice | Done |
| 4 | Adding a number generates a stable `id` (`crypto.randomUUID`) so flags survive edits | Done |
| 5 | Missing/legacy `id` on read is normalised to `phone-<index>` (never crashes) | Unit |
| 6 | Label renderer uses the flagged number, falling back to the first number | Unit |
| 7 | Invoice renderer lists every flagged number (`Label: value · …`) | Done |
| 8 | Empty numbers (blank value) are dropped on save | Done |

## 3. Label size & printing (`app_settings`)

| # | Item | Status |
|---|------|--------|
| 1 | Presets shipped: `50×25`, `60×40` (default), `75×50`, `100×50`, `100×100`, `100×150 (4×6)`, plus `Custom` | Done |
| 2 | Choosing a preset fills width/height; editing a dimension switches to `Custom` | Done |
| 3 | Live proportion preview + inline validation message | Done |
| 4 | Print (`runLabelPrint`) and PDF (`exportLabelsPdf`) both honour the configured size | Unit |
| 5 | `label_prefix` used by `labelService.create` (fallback `LBL`) | Unit |
| 6 | `invoice_prefix` used by `generate_invoice_for_customer` (fallback `INV`) | Migration |
| 7 | `auto_mark_printed` global toggle persisted (not a toast stub) | Done |

### 3.1 Size validation edge cases (4×6in = 101.6 × 152.4mm ceiling, orientation-safe)

| # | Input (W×H) | short edge | long edge | Result | Verified |
|---|-------------|-----------|-----------|--------|----------|
| 1 | 60 × 40 | 40 | 60 | valid | Unit |
| 2 | 101.6 × 152.4 (4×6, at ceiling) | 101.6 | 152.4 | valid | Unit |
| 3 | 152.4 × 101.6 (6×4 rotated) | 101.6 | 152.4 | valid | Unit |
| 4 | 100 × 150 | 100 | 150 | valid **+ near-limit warning** | Unit |
| 5 | 110 × 110 | 110 | 110 | **invalid** (short > 101.6) | Unit |
| 6 | 80 × 200 | 80 | 200 | **invalid** (long > 152.4) | Unit |
| 7 | 0 × 40 | 0 | 40 | **invalid** (must be > 0) | Unit |
| 8 | 60 × -1 | -1 | 60 | **invalid** | Unit |
| 9 | DB constraint `least ≤ 101.6 AND greatest ≤ 152.4` mirrors the client rule | — | — | enforced | Migration |

## 4. Label content toggles (`label_options`)

| # | Toggle | Default | Status |
|---|--------|---------|--------|
| 1 | `showCompanyName` | on | Done |
| 2 | `showCustomerName` | on | Done |
| 3 | `showSlNo` | on | Done |
| 4 | `showDate` | on | Done |
| 5 | `showWeight` | on | Done |
| 6 | `showRate` | off | Done |
| 7 | `showAmount` | on | Done |
| 8 | `showPhone` | off | Done |
| 9 | `showAddress` | off | Done |

Disabled fields are omitted from both the on-screen card and the PDF (unit-tested in `LabelPrintCard.test.tsx` and `documentPdf.test.ts`).

## 5. Invoice content toggles (`invoice_options`)

| # | Toggle | Default | Status |
|---|--------|---------|--------|
| 1 | `showTagline` | on | Done |
| 2 | `showAddress` | on | Done |
| 3 | `showGst` | on | Done |
| 4 | `showPhones` | on | Done |
| 5 | `showEmail` | on | Done |
| 6 | `showWebsite` | off | Done |
| 7 | `showContactPerson` | off | Done |
| 8 | `showDueDate` | on | Done |
| 9 | Due-date toggle is **document display only** — no effect on due-date selection, dues tracking, aging, or reminders | Done |

## 6. Snapshot vs live behavior

| # | Item | Status |
|---|------|--------|
| 1 | `company_snapshot` is captured at invoice generation (frozen identity) | Migration |
| 2 | `customer_snapshot` is captured at generation (name/address/email/phone/GST) | Migration |
| 3 | `invoice_options` stay **live** — toggling a field changes all invoices, including old ones | Done |
| 4 | Invoice renderer falls back to the live profile/customer when a snapshot is null (pre-existing invoices) | Done |
| 5 | Labels read settings live (they are printed/PDF'd immediately, not persisted) | Done |

## 7. Default-merge / resilience

| # | Item | Status |
|---|------|--------|
| 1 | Stored option blobs are merged over defaults, so a missing key never breaks rendering | Unit |
| 2 | Unknown keys are ignored; non-boolean values are ignored | Unit |
| 3 | A non-object / null blob resolves to the full default set | Unit |
| 4 | Missing `company_profile`/`app_settings` row falls back to code defaults (60×40, "My Company", empty phones) | Unit |

## 8. Roles & RLS

| # | Item | Status |
|---|------|--------|
| 1 | `company_profile` / `app_settings` selectable by any active member | Migration |
| 2 | Insert/update/delete restricted to owner/admin | Migration |
| 3 | Settings UI is read-only for staff — values are visible, the **Edit** action and modal are hidden | Done |

## 9. Verification

- [x] Unit tests: `settings.test.ts` (profile/settings mapping, defaults, partial-option merge, upsert), `labelPresets.test.ts` (all size edge cases above), `documentOptions.test.ts` (merge/resilience), `documentPdf.test.ts` (size, one page per label, rupee sanitisation, option filtering), `LabelPrintCard.test.tsx` (toggle-driven fields, label phone)
- [x] `auth.test.ts` covers `updatePassword`, `signOut` and `signOutAllDevices`
- [x] `oxlint` clean
- [x] `tsc -b` clean
- [x] Production build succeeds (jsPDF code-split into its own chunk)

## 10. Settings UX — view/edit, security & layout (2026-09-28)

Read-only display with modal editing, account security actions, and a settings
page redesign. Files: `src/pages/settings.tsx`,
`src/components/settings/CompanyDetailsSection.tsx`,
`src/components/settings/LabelPrintingSection.tsx`,
`src/components/settings/SectionHeader.tsx`,
`src/components/settings/ChangePasswordDialog.tsx`, `src/lib/password.ts`.

| # | Item | Status |
|---|------|--------|
| 1 | Company Details renders a **read-only summary** (name, tagline, contact, GSTIN, email, website, address, labelled phones) | Done |
| 2 | An **Edit** button opens the editable form in a modal dialog; Save persists and closes | Done |
| 3 | Label & Printing renders a **read-only summary** (size, prefixes, content chips, auto-mark) with the same Edit-modal pattern | Done |
| 4 | Staff see all values but no Edit button (view-only); a banner explains the restriction | Done |
| 5 | **Change password** opens a modal with new/confirm fields, show/hide, strength meter and rule checks (`authService.updatePassword`) | Done |
| 6 | Password strength helpers shared with the reset-password page via `src/lib/password.ts` | Done |
| 7 | **Sign out of this device** — confirmation dialog → `authService.signOut()` | Done |
| 8 | **Sign out of all devices** — confirmation dialog → `authService.signOutAllDevices()` (`signOut({ scope: 'global' })`) | Done |
| 9 | Removed the **Notifications** preference stub (toast-only, no persistence) | Done |
| 10 | Removed the **Sync with cloud** stub; About copy now states data is synced to the workspace | Done |
| 11 | Page typography hierarchy: eyebrow → page title (`headline-lg`) → section title (`headline-md`) → body/labels | Done |
| 12 | Shared `SectionHeader` gives every settings section a consistent icon chip, title, description and action slot | Done |
| 13 | Global heading scale raised (`headline-lg`/`headline` 30px, mobile 26px) so page titles outrank section titles | Done |

## 11. Follow-ups / deferred

- Logo upload (Supabase Storage bucket + policy) — column `logo_url` reserved.
- `currency` / `tax_percent` — deferred (currency is hardcoded across `format.ts`; invoice has no tax line and `amount = round(weight*rate,2)` is a DB invariant).
- Per-user preferences (theme) — to be stored in `localStorage` later, per product decision.
- Device/session **list** with per-session revoke — Supabase exposes no per-session listing; current scope is this-device + global only.
- Notifications preference — deferred until a persistence model exists.
