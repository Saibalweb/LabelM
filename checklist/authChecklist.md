# Auth Checklist — identity, membership & email flows

Created 2026-09-27. Scope: the full auth surface — login methods, invite
lifecycle, revoke, membership status, and (Phase 2) real email delivery.

## 1. Approach — two tiers

| Tier | Mechanism | Runs | Cost |
|---|---|---|---|
| **1 — logic (done)** | Real `invite-user`/`revoke-user` Edge Functions over HTTP; accept links minted via the Admin API (no email) | every change / CI | fast, deterministic |
| **2 — real SMTP (Phase 2)** | ZeptoMail → YOPmail: read the delivered email, click the emailed link | pre-release / opt-in `E2E_EMAIL=1` | slow, external |

Why split: most edge cases are about logic (role gating, status transitions,
RLS), not about the mail pipe. Tier 1 proves the logic; Tier 2 proves delivery +
template + link correctness.

### How to run

```bash
# Tier 1 (staging only; service role key from the shell, never committed)
SUPABASE_SERVICE_ROLE_KEY=... E2E_STAGING_REF=hleadfeikniejvlhbqzd \
  npm run test:e2e:auth

# Tier 2 (real email)
E2E_EMAIL=1 SUPABASE_SERVICE_ROLE_KEY=... E2E_STAGING_REF=hleadfeikniejvlhbqzd \
  npm run test:e2e:email
```

Fixtures: `e2e/fixtures/admin.ts` (service role, link minting, provisioning),
`e2e/fixtures/identities.ts` (per-run `@yopmail.com` identities),
`e2e/fixtures/mailbox.ts` (YOPmail reader), `e2e/fixtures/globalSetup.ts`
(staging guard). Specs: `auth-invite`, `auth-membership`, `auth-login`,
`auth-email-delivery`.

## 2. Edge-case matrix

### Invite creation (`invite-user`)
| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 1 | owner invites staff | 200, row `invited` | 1 | ✅ pass |
| 2 | owner invites admin | 200, role admin | 1 | ✅ pass |
| 3 | admin invites staff | 200 | 1 | ✅ pass |
| 4 | admin invites admin | 403 | 1 | ✅ pass |
| 5 | invalid email | 400 | 1 | ✅ pass |
| 6 | role `owner` | 400 | 1 | ✅ pass |
| 7 | missing bearer token | 401 | 1 | ✅ pass |
| 8 | suspended caller | 403 | 1 | ✅ pass |
| 9 | email normalization (case) | stored lowercase | 1 | ✅ pass |
| 10 | **staff caller invites staff** | **403** | 1 | ❌ **BUG 2** |

### Re-invite / resend
| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 11 | re-invite pending | resend, no duplicate row | 1 | ❌ **BUG 1** (500) |
| 12 | re-invite active member | 409 | 1 | ✅ pass |
| 13 | re-invite suspended member | 409 | 1 | ✅ pass |
| 14 | resend invalidates old emailed link | observe | 2 | ⏳ Phase 2 |

### Revoke (`revoke-user`)
| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 15 | revoke pending → profile + auth user gone | 200 | 1 | ✅ pass |
| 16 | revoked link can no longer be accepted | verify fails | 1 | ✅ pass |
| 17 | re-invite after revoke | 200, fresh user | 1 | ✅ pass |
| 18 | orphan self-heal (purge left auth user) | 200 | 1 | ✅ pass |
| 19 | revoke active member | 409 | 1 | ✅ pass |
| 20 | admin revokes staff invite | 200 | 1 | ✅ pass |
| 21 | admin revokes admin invite | 403 | 1 | ✅ pass |
| 22 | revoke owner | 403/409, not removed | 1 | ✅ pass |
| 23 | unknown member id | 404 | 1 | ✅ pass |
| 24 | missing bearer token | 401 | 1 | ✅ pass |
| 25 | **staff caller revokes invite** | **403** | 1 | ❌ **BUG 3** |

### Accept invite
| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 26 | happy path (name + password) | active, dashboard | 1 | ✅ pass |
| 27 | revoked while accept page open | verify fails | 1 | ✅ pass |
| 28 | tampered token | error | 1 | ✅ pass |
| 29 | link without `type=invite` | invalid state | 1 | ✅ pass |
| 30 | expired token | friendly expiry message | 2 | ⏳ Phase 2 |
| 31 | reused token | fail | 2 | ⏳ Phase 2 |
| 32 | weak / mismatched password | blocked client-side | 1 | ✅ pass |
| 33 | already-active accepts again | `no pending invitation` | 2 | ⏳ Phase 2 |

### Membership (the "can they stay on the site?" question)
| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 34 | suspend → next load | `/unauthorized` | 1 | ✅ pass |
| 35 | suspended loses business-table access | reads `[]`, writes 401/403 | 1 | ✅ pass |
| 36 | suspended can still read own profile | 200 | 1 | ✅ pass |
| 37 | reactivate | access restored | 1 | ✅ pass |
| 38 | admin cannot suspend admin | RPC error | 1 | ✅ pass |
| 39 | admin "Suspend member" | suspends (row kept) | 1 | ✅ pass |
| 40 | owner "Suspend member" | suspends (row kept) | 1 | ✅ pass |
| 41 | hard delete (purge) in UI | not offered; RPC left optional (authPlan §15) | 1 | ⛔ removed |

### Team management UI (client-side gating + feedback)

The menu now mirrors the `admin_update_member_status` rule: the owner manages
any admin/staff, an admin manages staff only, and the owner row is never
manageable. Removal is **soft only** — the "Remove member" hard-delete action
was removed from the UI; members are suspended (and reactivated) instead. The
`owner_purge_member` RPC still exists but is intentionally unused (authPlan §15).
Unit-tested in `src/pages/__tests__/team.test.tsx` (Vitest, mocked `teamService`);
the same gating is asserted end-to-end (staging, Tier 1) by
`auth-membership.spec.ts` → "the Team UI hides admin actions an admin may not
perform" and "the Team UI removes members by suspension only — no hard delete".

| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 58 | admin opens menu on another admin | no Suspend; shows "Only the owner can manage admins" | unit | ✅ pass |
| 59 | admin opens menu on staff | Suspend shown; no Remove member | unit | ✅ pass |
| 60 | owner opens menu on admin | Demote + Suspend shown; no Remove member | unit | ✅ pass |
| 61 | non-owner opens menu on owner | no "Transfer ownership" | unit | ✅ pass |
| 62 | action in flight | row trigger disabled + spinner; duplicate click ignored | unit | ✅ pass |
| 63 | signed-in user in list | row pinned to top, highlighted, "You" chip | unit | ✅ pass |
| 64 | owner/admin menu (any target) | no hard-delete "Remove member" | unit | ✅ pass |

### Login / magic / reset
| # | Case | Expected | Tier | Status |
|---|---|---|---|---|
| 42 | wrong password | inline error | 1 | ✅ pass |
| 43 | unknown email | generic error (no enumeration) | 1 | ✅ pass |
| 44 | forgot-password request | always confirms | 1 | ✅ pass |
| 45 | magic-link request | confirmation screen | 1 | ✅ pass |
| 46 | non-member with valid credentials | bounced from app | 1 | ✅ pass |
| 47 | logged-out deep link preserves `from` | redirect back | 1 | ✅ pass (auth-basic) |
| 48 | logout clears session + query cache | login page | 1 | ✅ pass (auth-basic) |
| 49 | magic link click (active member) | logged in | 2 | ⏳ Phase 2 |
| 50 | reset link → new password → login | works | 2 | ⏳ Phase 2 |
| 51 | magic/reset link expiry | fail | 2 | ⏳ Phase 2 |

### Real delivery (Phase 2)
| # | Case | Expected | Status |
|---|---|---|---|
| 52 | invite email is delivered from `noreply@saibal.dev` | arrives | ✅ pass |
| 53 | magic-link email arrives, click logs in | logged in | ✅ pass |
| 54 | reset email arrives, click → set password | reset form | ❌ **BUG 5** (config) — Tier 2 blocked by YOPmail |
| 55 | emailed invite link reaches `/accept-invite` | accept form | ❌ **BUG 4** (config) — Tier 2 blocked by YOPmail |
| 56 | re-invite sends a fresh email | new mail | 🔧 BUG 1 fixed (Tier 1 green) — Tier 2 rerun pending |
| 57 | link host = app origin (not `<ref>.supabase.co`) | correct | ❌ **BUG 4/5** (config) — Tier 2 blocked by YOPmail |

> **Why 54–57 are still red:** these are the only Tier 2 rows, and Tier 2 needs a
> real emailed link. **54/55/57** are BUG 4/5 — Auth URL config (Site URL +
> redirect allowlist), dashboard-side, not yet applied. **56** is BUG 1, now
> fixed in code and green in Tier 1; it just awaits a Tier 2 rerun. None can be
> re-verified until the Auth URL config is applied *and* YOPmail's Turnstile
> cooldown passes (or `mailbox.ts` is swapped for Mailtrap/MailSlurp).

> **YOPmail throttling:** repeated polling triggers YOPmail's anti-bot handshake
> throttle, which surfaces as `totalEmails: -1`. The reader treats that as a
> transient hiccup and keeps polling, but Tier 2 must be run sparingly (not in a
> tight loop) or it will time out. `E2E_EMAIL=1` only.

## 3. Bugs found (Tier 1)

1. ✅ **FIXED — Re-invite/resend of a pending invite returned 500.**
   `inviteUserByEmail` returns success (no error) for an already-invited user, so
   `invite-user` skipped its resend branch and the `employees` INSERT hit
   `employees_pkey`. Breaks the "Resend invite" button. Probe-confirmed:
   `{"error":"duplicate key value violates unique constraint \"employees_pkey\""}`.
   Fix: `invite-user` now looks up the `employees` row **before** inviting —
   pending → re-call `inviteUserByEmail` to resend, active/suspended → 409, so
   the duplicate INSERT never runs. Root cause of the *first* fix attempt's 500:
   the original resend used `admin.auth.admin.resend`, which does **not** exist
   on the Admin API (only `GoTrueClient.resend`, which rejects `type: 'invite'`)
   — it threw a `TypeError` → generic 500. Calling `inviteUserByEmail` again is
   the supported resend path.
2. ✅ **FIXED — `invite-user` did not require owner/admin for staff invites.**
   It only blocked non-active callers and admin-granting, so a staff JWT could
   invite staff directly — privilege escalation. The Edge Function is the
   security boundary (the UI is gated, but direct calls bypass it). Fix: require
   `callerRole in ('owner','admin')`; admin may only invite staff.
3. ✅ **FIXED — `revoke-user` did not require owner/admin.**
   It only checked the caller is active, so staff could revoke pending invites.
   Fix: require `callerRole in ('owner','admin')`; admin may only revoke staff.
4. **Purge leaves an orphaned `auth.users` row** (known). `invite-user`
   self-heals it on re-invite. The UI no longer exposes purge, so this is only
   reachable via a direct RPC call; kept as an optional future feature
   (authPlan §15).
5. **Emailed invite link lands on `/`, not `/accept-invite`.** Supabase rejects
   the invite redirect target and falls back to the **Site URL**, which drops the
   path. Probe output: `http://192.168.1.106:5173?token_hash=…&type=invite`.
   Recipients cannot complete onboarding from the email. (Auth URL config.)
6. **Password-reset link lands on `/`, not `/reset-password`.** Same fallback:
   the recovery link redirects to the Site URL with a session hash, so the user
   is signed in at the dashboard instead of being asked to set a new password.
   The `/reset-password` URL is not in the Auth redirect allowlist.

> Root cause for BUG 5/6: the hosted **Site URL is a LAN IP**
> (`http://192.168.1.106:5173`) and the **redirect allowlist is incomplete**.
> Per `authPlan.md` §13: set Site URL to the app origin and allowlist
> `/accept-invite` (and `/reset-password`). This is dashboard config, not code —
> `supabase/config.toml` only covers local dev.

The `test.fail` markers for BUG 1–3 (Tier 1 tests 10/11/25 and Tier 2 test 56)
are **removed**. **Tier 1 on staging (2026-09-28): 34/34 passed**, verifying BUG
1, BUG 2 and BUG 3. BUG 4/5 are config-blocked, so their Tier 2 markers (tests
54/55) stay until the Auth URL config is applied.

Also fixed from the same run: the Team "Member options" dropdown could not be
closed by re-clicking its trigger — the document `mousedown` close handler ran
first and the button's `onClick` toggle then re-opened it. `src/pages/team.tsx`
now stops the trigger's `mousedown` from reaching the document handler.

## 4. Verification (Phase 1)

| # | Item | Status |
|---|---|---|
| 1 | `npm run lint` | ✅ clean (only pre-existing warnings) |
| 2 | `npm run build` (tsc + vite) | ✅ |
| 3 | `npm test` | ✅ 324 passed |
| 4 | `npm run test:e2e:auth` vs staging (2026-09-28) | ✅ 34/34 passed (BUG 1–3 green) |
| 5 | Staging test users cleaned up | ✅ 58 removed |

## 5. Follow-ups

- [x] Fix BUG 1 (resend duplicate key) — `invite-user` now checks the existing
      `employees` row up front (pending → resend, active/suspended → 409) so the
      duplicate INSERT can never run.
- [x] Fix BUG 2/3 — owner/admin now required in `invite-user` and `revoke-user`.
- [x] Redeploy `invite-user` + `revoke-user` to **staging** and rerun
      `npm run test:e2e:auth` → 34/34 green (2026-09-28).
- [ ] Deploy both functions to **prod** at ship time (same code).
- [ ] Fix BUG 5/6 — Supabase Auth URL config: set **Site URL** to the app origin
      and allowlist `/accept-invite` + `/reset-password` (dashboard, both
      staging and prod).
- [ ] (Optional) Re-enable member hard-delete: route `owner_purge_member` through
      auth cleanup (delete the `auth.users` row too) and wire the UI — see
      `authPlan.md` §15.
- [ ] **Accept-invite while already signed in (explicit switch confirmation).**
      Today `/accept-invite` is public and unguarded, so a signed-in user who
      opens an invite for a *different* email silently has their session swapped
      by `verifyOtp` — the browser ends up signed in as the invitee. Planned fix:
      when `status === 'authenticated'` and the current user is not the invitee,
      show a "You're signed in as X. Accept this invite and switch accounts?"
      step that calls `signOut()` before rendering the form. Include the invited
      email in the link/template so the account being switched to is explicit.
      Also harden the swap: clear the React Query cache when the authenticated
      user id changes (currently only on `SIGNED_OUT`, see
      `src/components/auth/AuthListener.tsx`), and remove the `restricted` race
      where `onAuthStateChange` fetches the invitee's profile before
      `activate_my_membership` flips it to `active`.
- [x] **RBAC capability matrix — `e2e/roles.spec.ts` (shipped, 14/14 green).**
      Drives the app as owner/admin/staff (fixed `.env` creds) and asserts:
      `/invoice/new` + `/team` blocked for staff, settings view-only vs editable,
      invoice-generation gating, customer archive/restore gating, and owner-only
      "invite/promote admins". Run `npm run test:e2e:roles` (needs
      `ADMIN_EMAIL`/`ADMIN_PASSWORD` + `STAFF_EMAIL`/`STAFF_PASSWORD` and
      `VITE_TRIAL_MODE=false`; no service-role key). **Deferred:** payment-delete
      gating needs a seeded invoice+payment. Also tracked in `finalTodo.md §2.5`.

## 6. Tier 2 results (real SMTP, 2026-09-27)

| Test | Result |
|---|---|
| invite email delivered from `noreply@saibal.dev` | ✅ (proven on first run) |
| magic-link email + click logs in | ✅ (proven on first run) |
| emailed invite link completes onboarding | ❌ BUG 5 (Site-URL fallback) |
| reset link sets a new password | ❌ BUG 6 (Site-URL fallback) |
| re-invite sends a fresh email | 🔧 BUG 1 fixed in code — rerun pending |

**YOPmail availability caveat.** After a burst of sends/polls, YOPmail started
serving a **Cloudflare Turnstile challenge** on the inbox frame, so the headless
reader gets an empty/throttled page (`w.finrmail(-1,…)`) for **every** inbox,
including YOPmail-to-YOPmail self-sends. Confirmed via a headed Chromium session:
the inbox frame loads `challenges.cloudflare.com/.../turnstile/...`.

- **Manual testing still works:** a human browser passes the Turnstile check
  (usually automatically or with one click). Open <https://yopmail.com>, enter
  the address, solve the check if shown. Existing inboxes/mail persist.
- **Automated Tier 2 is affected:** the reader can't solve Turnstile. It may
  recover after a cooldown, but for reliable CI swap `mailbox.ts` for a
  registered sandbox (Mailtrap / MailSlurp) — the spec only depends on
  `waitForEmail` + `extractLink`.

Two facts were still proven before the challenge appeared: the invite email is
delivered from `noreply@saibal.dev`, and a magic-link email click signs the
member in.

## 7. Manual Tier 2 runbook (real SMTP) — TODO

Tier 2 verifies the **actual emailed links** end-to-end. It is the only place
BUG 4/5 (invite/reset redirect URLs) can be observed, and YOPmail's Turnstile
currently blocks the automated reader (§6). Use this manual pass until
`mailbox.ts` is swapped for Mailtrap/MailSlurp.

### 7.1 Prerequisites

- [ ] SMTP configured on **staging** (Supabase → Auth → SMTP Settings); sender
      `noreply@saibal.dev` for now.
- [ ] **Auth URL Configuration** on staging: **Site URL** = the app origin, and
      allowlist `<origin>/accept-invite` + `<origin>/reset-password`. (This is the
      BUG 4/5 fix — without it the links fall back to the Site URL.)
- [ ] `invite-user` + `revoke-user` deployed to staging.
- [ ] `ALLOWED_ORIGINS` / `APP_URL` secrets set (so the browser can call the
      functions) — see `finalTodo.md §2.8`.
- [ ] App running locally: `npm run dev`, `.env` → staging, `VITE_TRIAL_MODE=false`.
- [ ] A YOPmail inbox you can open in a browser (e.g. `labelm-e2e-manual@yopmail.com`).
- [ ] `OWNER_EMAIL` / `OWNER_PASSWORD` in `.env` for the app sign-in.

### 7.2 Automated attempt (if YOPmail cooperates)

```bash
E2E_EMAIL=1 \
SUPABASE_SERVICE_ROLE_KEY=... \
E2E_STAGING_REF=hleadfeikniejvlhbqzd \
npm run test:e2e:email
```

If it fails on `totalEmails: -1` / a Turnstile page, do the manual pass below.

### 7.3 Manual procedure

**Case A — invite delivery + link target + onboarding (tests 52/55/57)**
1. Sign in as the owner in the app → **Team** → **Invite member**.
2. Enter `labelm-e2e-manual@yopmail.com`, role **Staff** → **Send invitation**.
3. Open <https://yopmail.com>, enter the address, solve the Turnstile if shown.
4. Confirm the email arrived from the expected sender, subject "You've been
   invited…".
5. Inspect the CTA link: host must be the **app origin** (e.g.
   `http://localhost:5173`), path **`/accept-invite`**, with
   `?token_hash=…&type=invite`. If it points at the LAN IP or `/`, **BUG 4 is not
   fixed** (Site URL / allowlist).
6. Click it → the **Accept invitation** form appears.
7. Fill name + password → **Accept invitation & sign in** → dashboard; the member
   row shows **Active**.

**Case B — re-invite sends a fresh email (test 56)**
1. With that same pending email, **Team** → row **Member options** → **Resend invite**.
2. Confirm no 500 (the row is not duplicated) and a **new** email arrives with a
   different link/token.

**Case C — password reset (tests 50/54)**
1. Sign out → **Forgot password?** → enter the manual inbox → **Send reset link**.
2. Open the reset email → the link must land on **`/reset-password`** with a
   recovery session (not `/`). If it lands on `/`, **BUG 5 is not fixed**.
3. Set a new password → redirected to `/login` → sign in with the new password.

**Case D — magic link (tests 49/53)**
1. Login page → **Email me a magic link** → inbox.
2. Click the link → lands on the dashboard, signed in.

### 7.4 Pass criteria

| Case | Clears |
|------|--------|
| A — invite link lands on `/accept-invite` + onboarding | 52, 55, 57 (BUG 4) |
| B — re-invite delivers a fresh email, no 500/duplicate | 56 (BUG 1) |
| C — reset link lands on `/reset-password` | 50, 54 (BUG 5) |
| D — magic link signs in | 49, 53 |

- [ ] Case A passed
- [ ] Case B passed
- [ ] Case C passed
- [ ] Case D passed
- [ ] (Optional) Swap `e2e/fixtures/mailbox.ts` for Mailtrap/MailSlurp so Tier 2
      runs in CI again, then re-run `npm run test:e2e:email`.
