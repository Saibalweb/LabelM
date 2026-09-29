# LabelM — Branding / Logo Rebrand Plan (Maira Cam 3D)

> Status: **PLANNED — not implemented.** Save for later execution.
> Scope decision: **Option A — full rebrand of the visible app to "Maira Cam 3D".**

## 1. Decisions locked

- Full rebrand of the **visible/presentational** app to **Maira Cam 3D**.
- Logo is **static / bundled**. **No** Supabase Storage, **no** logo upload UI.
- Nav icons: **keep the existing QrCode icon** in the sidebar/topnav.
  The logo image is used for: **favicon**, **invoice print card**, **email badge**.
- `company_profile.logo_url` and the `logoUrl` type stay in the schema but
  **unused** — harmless, and a clean hook if per-company logos are added later.
- The generated mark is a hexagon **M** monogram from the Stitch brand sheet
  ("MAIRA CAM 3D", tagline "Direct Castable & Non-Castable"), blue palette.

## 2. Why the rename is safe (no config/DB changes)

"Rebrand" here is **presentational text only**. It does **not** touch any config
file. The following must **stay as-is** to avoid breaking the stack:

- `supabase/config.toml` → `project_id = "labelm"`
- `package.json` → `"name": "labelm"`
- All migration filenames and SQL (table/column names: `company_profile`,
  `employees`, etc.)
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_TRIAL_MODE`)
- Domain `labelm.saibal.dev`, storage keys, test fixtures
- Sender name/address (a Supabase dashboard setting, authPlan.md §14)

No test asserts the "LabelMaster" UI text (only an unrelated e2e email prefix
`LabelM-E2E-` in `e2e/auth-invite.spec.ts:131`), so the rename is low-risk.

## 3. Asset strategy

| Asset | Path | Used by |
|---|---|---|
| Vector mark | `src/assets/brand/logo.svg` (hand-authored to match the Stitch sheet) | favicon source, invoice card, inline component |
| Email logo | `public/brand/logo-email.png` (~160px, 2×) | email templates |
| Favicon | `public/favicon.svg` (replace the default purple AI-studio logo) | `index.html:5` |
| App icons (optional) | `public/brand/apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | PWA / manifest (add manifest if wanted) |
| PDF logo | `src/assets/brand/logo.png` (300dpi) | `documentPdf.ts` `addImage` |

> The SVG will be hand-authored to match the hexagon-M. If the actual asset can
> be exported from Stitch (SVG/PNG), use that instead. PNGs are derived from the
> SVG (confirm a converter is available, else export from Stitch).

### Format → placement reference

| Placement | File | Why |
|---|---|---|
| Master source | `.svg` (vector) | Scalable, editable; export everything else from it |
| Browser favicon | `public/favicon.svg` (+ 180/192/512 `.png`, `.ico`) | SVG modern; PNG/ICO for Safari/legacy |
| App chrome | inline `.svg` component | Crisp, themeable |
| Printed labels/invoices (PDF) | `.png` @300dpi, transparent | jsPDF `addImage` supports PNG/JPEG only, not SVG |
| Email templates | `.png` at an **absolute** public URL | Gmail/Outlook don't render SVG; base64 unreliable |
| Print / vendor handoff | `.pdf` / `.ai` / `.eps` | print shops require vector |

## 4. File-by-file changes

### 4.1 Rebrand strings

| File | Line(s) | New text |
|---|---|---|
| `src/components/layout/SideNav.tsx` | 70 | `Maira Cam 3D` |
| `src/components/layout/TopNav.tsx` | 145 | `Maira Cam 3D` |
| `src/components/auth/AuthLayout.tsx` | 147, 151, 194 | `Maira 3D Ecosystem` / `Maira Cam 3D` |
| `src/pages/team.tsx` | 440 | `…configure Maira Cam 3D operations.` |
| `src/pages/settings.tsx` | 293 | `Maira Cam 3D` |
| `src/pages/auth/acceptInvite.tsx` | 79 | `Welcome to Maira Cam 3D` |
| `src/pages/auth/accessRestricted.tsx` | 34 | real support address (confirm) |
| `index.html` | 7 | `<title>Maira Cam 3D</title>` |

### 4.2 Logo wiring

- `src/components/invoices/InvoicePrintCard.tsx:47-49` — replace the `<Layers>`
  box with `<img src={logo} alt="Maira Cam 3D" className="h-12 w-auto">`.
- `src/lib/documentPdf.ts` `drawInvoice` (~line 219) — add
  `doc.addImage(logoDataUrl, 'PNG', left, y, w, h)` before the company header and
  shift `y` down.
- `public/favicon.svg` — new brand mark.
- New `src/components/brand/Logo.tsx` — reusable inline-SVG component (optional).
- `src/components/labels/LabelPrintCard.tsx` — has no brand mark (company name
  text only); leave unless a logo is explicitly wanted on labels.

### 4.3 Email templates

Files: `supabase/templates/invite.html`, `magic-link.html`, `recovery.html`.

1. Replace the `<td>LM</td>` badge with
   `<img src="https://<origin>/brand/logo-email.png" width="40" height="40" alt="Maira Cam 3D" style="display:block;border:0;">`
   (keep alt text for images-off clients).
2. Rename all copy `LabelMaster Pro` → `Maira Cam 3D` (subject, `<title>`,
   headings, footer).
3. `recovery.html` — switch the CTA to
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`
   (per `finalTodo.md` BUG 6; `invite.html` already does this).
4. `supabase/config.toml` — add `[auth.email.template.invite]`,
   `[auth.email.template.magic_link]`, `[auth.email.template.recovery]` with
   `subject` + `content_path` so local dev uses these files.

> Emails cannot be dynamic per-tenant: GoTrue only exposes fixed variables
> (`.ConfirmationURL`, `.SiteURL`, `.RedirectTo`, `.Email`, `.Data.*`). The email
> logo must therefore be a static absolute URL. Per-tenant dynamic emails would
> require sending via ZeptoMail's API from an edge function (separate project).

## 5. Manual dashboard steps (not code)

- Supabase dashboard → Auth → Email Templates: paste the 3 updated HTMLs
  (the hosted project does not read the repo).
- Auth → SMTP: set Sender name to `Maira Cam 3D` when the client domain is ready
  (authPlan.md §14).
- Auth → URL Configuration: ensure the production origin is listed.

## 6. Explicitly NOT doing (dropped)

- No `branding` Supabase Storage bucket, no `storage.objects` RLS migration.
- No logo upload UI in `src/components/settings/CompanyDetailsSection.tsx`.
- No `settings.ts` logo write path, no cache-busting, no orphan cleanup, no
  snapshot-integrity handling.
- `company_profile.logo_url` / `logoUrl` remain in schema, unused.

## 7. Verification

- `npm run lint` (oxlint)
- `npm run build` (tsc + vite)
- `npm run test` (vitest)
- Manual preview: login screen, sidebar/topnav, settings, an invoice print card,
  and `exportInvoicePdf`.

## 8. Open items (answer before implementing)

1. Export the logo from Stitch (SVG/PNG), or hand-author the SVG to match?
2. Real support email to replace `support@labelmaster.io` in
   `accessRestricted.tsx`?
3. Confirm the tagline stays **"Direct Castable & Non-Castable"** under the
   wordmark.
