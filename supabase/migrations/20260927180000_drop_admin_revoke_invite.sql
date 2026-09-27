-- LabelM — retire the admin_revoke_invite RPC.
--
-- Revoking an invitation now goes through the `revoke-user` Edge Function
-- (service role), which removes BOTH the `employees` row and the matching
-- `auth.users` row. The old RPC could only delete the `employees` row, leaving
-- an orphaned auth user that made re-invites fail with 409 ("That email already
-- belongs to this workspace"). Keeping the RPC around would leave a second,
-- broken revoke path, so drop it.

drop function if exists public.admin_revoke_invite(uuid);
