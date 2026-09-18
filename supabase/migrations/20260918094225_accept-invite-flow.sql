-- LabelM — Accept-invite flow support.
--   * activate_my_membership(full_name) — invitee completes onboarding by
--     setting their own full_name and flipping status 'invited' -> 'active'.
--     Direct client writes cannot touch status, so this goes through an RPC.
--   * admin_revoke_invite(member_id) — owner/admin deletes the profile row of a
--     member who has NOT joined yet (status 'invited'). The matching auth user
--     is cleaned up separately (Auth admin API / dashboard); this RPC only
--     clears the employees row so the invite can be re-issued.

-- ---------------------------------------------------------------------------
-- RPC: activate_my_membership  (self-service, invitee only)
-- ---------------------------------------------------------------------------
create or replace function public.activate_my_membership(new_full_name text)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.employees;
begin
  update public.employees
     set full_name   = coalesce(nullif(trim(new_full_name), ''), full_name),
         status      = 'active',
         updated_at  = now()
   where id = auth.uid()
     and status = 'invited'
   returning * into result;

  if not found then
    raise exception 'no pending invitation' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin_revoke_invite  (owner + admin)
--   Admin may only revoke staff invites; owner may revoke any non-owner invite.
-- ---------------------------------------------------------------------------
create or replace function public.admin_revoke_invite(member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role  text;
  target_role public.employee_role;
begin
  actor_role := public.get_my_role();

  if actor_role not in ('owner', 'admin') or not public.is_active_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select role into target_role
    from public.employees
   where id = member_id
     and status = 'invited';

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if actor_role = 'admin' and target_role <> 'staff' then
    raise exception 'admins can only manage staff' using errcode = '42501';
  end if;

  delete from public.employees where id = member_id;
end;
$$;

revoke execute on function public.activate_my_membership(text) from public, anon;
revoke execute on function public.admin_revoke_invite(uuid) from public, anon;

grant execute on function public.activate_my_membership(text) to authenticated;
grant execute on function public.admin_revoke_invite(uuid) to authenticated;