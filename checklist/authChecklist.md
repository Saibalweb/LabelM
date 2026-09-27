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
| 39 | admin "Remove member" | suspends (row kept) | 1 | ✅ pass |
| 40 | owner "Remove member" | purges (row gone) | 1 | ✅ pass |
| 41 | purge leaves orphaned `auth.users` | known; self-healed on re-invite | 1 | ⚠️ known |

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
| 54 | reset email arrives, click → set password | reset form | ❌ **BUG 5** |
| 55 | emailed invite link reaches `/accept-invite` | accept form | ❌ **BUG 4** |
| 56 | re-invite sends a fresh email | new mail | ❌ **BUG 1** |
| 57 | link host = app origin (not `<ref>.supabase.co`) | correct | ❌ **BUG 4/5** |

> **YOPmail throttling:** repeated polling triggers YOPmail's anti-bot handshake
> throttle, which surfaces as `totalEmails: -1`. The reader treats that as a
> transient hiccup and keeps polling, but Tier 2 must be run sparingly (not in a
> tight loop) or it will time out. `E2E_EMAIL=1` only.

## 3. Bugs found (Tier 1)

1. **Re-invite/resend of a pending invite returns 500.**
   `inviteUserByEmail` returns success (no error) for an already-invited user, so
   `invite-user` skips its resend branch and the `employees` INSERT hits
   `employees_pkey`. Breaks the "Resend invite" button. Probe-confirmed:
   `{"error":"duplicate key value violates unique constraint \"employees_pkey\""}`.
2. **`invite-user` does not require owner/admin for staff invites.**
   It only blocks non-active callers and admin-granting, so a staff JWT can
   invite staff directly — privilege escalation. The Edge Function is the
   security boundary (the UI is gated, but direct calls bypass it).
3. **`revoke-user` does not require owner/admin.**
   It only checks the caller is active, so staff can revoke pending invites.
4. **Purge leaves an orphaned `auth.users` row** (known). `invite-user`
   self-heals it on re-invite; a future pass should route purge through the same
   auth cleanup.
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

Tests 10, 11, 25 (Tier 1) and 54/55/56 (Tier 2) are marked `test.fail` until
these are fixed; remove the markers once green.

## 4. Verification (Phase 1)

| # | Item | Status |
|---|---|---|
| 1 | `npm run lint` | ✅ clean (only pre-existing warnings) |
| 2 | `npm run build` (tsc + vite) | ✅ |
| 3 | `npm test` | ✅ 234 passed |
| 4 | `npm run test:e2e:auth` vs staging | ✅ 33 passed (3 expected failures) |
| 5 | Staging test users cleaned up | ✅ 58 removed |

## 5. Follow-ups

- [ ] Fix BUG 1 (resend duplicate key) — the resend path must detect an existing
      `employees` row even when `inviteUserByEmail` does not error.
- [ ] Fix BUG 2/3 — require owner/admin in `invite-user` and `revoke-user`.
- [ ] Fix BUG 5/6 — Supabase Auth URL config: set **Site URL** to the app origin
      and allowlist `/accept-invite` + `/reset-password` (dashboard, both
      staging and prod).
- [ ] Route `owner_purge_member` through auth cleanup (remove the orphan).
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
- [ ] Next phase: RBAC capability matrix (`roles.spec.ts`) — create invoice,
      edit label, archive customer, payment delete, settings, promote/purge.

## 6. Tier 2 results (real SMTP, 2026-09-27)

| Test | Result |
|---|---|
| invite email delivered from `noreply@saibal.dev` | ✅ (proven on first run) |
| magic-link email + click logs in | ✅ (proven on first run) |
| emailed invite link completes onboarding | ❌ BUG 5 (Site-URL fallback) |
| reset link sets a new password | ❌ BUG 6 (Site-URL fallback) |
| re-invite sends a fresh email | ❌ BUG 1 |

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
