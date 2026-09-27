# Team Invite Checklist — Re-invite after revoke (`/team`)

Reviewed & fixed on 2026-09-27.

Covers the **invite / resend / revoke** flow between the Team page and the
`invite-user` Edge Function.

---

## 1. Bug — re-invite after revoke returns 409 "That email already belongs to this workspace"

| # | Item | Status |
|---|------|--------|
| 1 | Reproduced: invite `saibalkole@yopmail.com` → never joined → owner revokes → `employees` row gone, `auth.users` row remains | Done |
| 2 | Re-invite fails because `auth.admin.inviteUserByEmail` rejects the existing auth user ("already registered") | Done |
| 3 | `invite-user` then looks up the email in `employees`, finds nothing, and falls through to the generic 409 | Done |
| 4 | Root cause: `admin_revoke_invite` only deletes the `employees` row; the matching `auth.users` row is left orphaned (the migration even notes auth cleanup is "separate", but it was never wired up) | Confirmed |

**Verdict: FIXED** — see below.

---

## 2. Fix — `invite-user` self-heals orphaned auth users

| # | Item | Status |
|---|------|--------|
| 1 | On "already exists", distinguish three cases: pending invite (`employees.status = 'invited'`) → resend; existing member (`active`/`suspended`) → 409; no `employees` row → orphaned auth user | Done |
| 2 | Orphan case: locate the auth user by email (`listUsers`, paginated), hard-delete it, then retry the invite once | Done |
| 3 | A failed orphan cleanup returns a clear 500 instead of the misleading 409 | Done |
| 4 | Existing resend + cleanup-on-insert-failure behaviour preserved | Done |

---

## 3. Fix — revoke removes the auth user (prevents new orphans)

| # | Item | Status |
|---|------|--------|
| 1 | New `revoke-user` Edge Function (service role) deletes the pending invite's `employees` row **and** its `auth.users` row | Done |
| 2 | Authorization mirrors `admin_revoke_invite`: active owner/admin only; admins may only revoke staff; owner cannot be revoked; only `status = 'invited'` rows are revocable | Done |
| 3 | `teamService.revokeInvite` now invokes the function instead of the `admin_revoke_invite` RPC | Done |
| 4 | `config.toml` registers `revoke-user` with `verify_jwt = true` | Done |
| 5 | The old `admin_revoke_invite` RPC is retired by migration `20260927180000_drop_admin_revoke_invite.sql` (single revoke path) | Done |

---

## 4. Verification

| # | Item | Status |
|---|------|--------|
| 1 | `npm run lint` | Done — no new warnings |
| 2 | `npm run build` (tsc + vite) | Done |
| 3 | `npm test` | Done — 234 passed |
| 4 | Manual: invite → revoke → re-invite succeeds and a fresh email arrives | Pending |
| 5 | Manual: invite → (still pending) → re-invite resends the existing link | Pending |

---

## Notes / follow-ups

- `owner_purge_member` has the same orphan shape (deletes the `employees` row
  but not `auth.users`). The new self-heal in `invite-user` covers it for
  re-invites; a future pass should route purge through the same auth cleanup.
- Deploy the new function: `supabase functions deploy revoke-user` (and redeploy
  `invite-user`).
