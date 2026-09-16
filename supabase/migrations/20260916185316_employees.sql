-- LabelM — employees table, role helpers, RLS policies, member-management RPCs.
-- Phase 1 of authPlan.md (§6 schema, §7 RLS).
--
-- Security model
--   * RLS is enabled; `anon` has no access at all.
--   * Direct client access: a member may read their own row and edit only
--     full_name / avatar.
--   * Role/status changes and purges are NOT possible via direct table writes;
--     they go through SECURITY DEFINER RPCs that re-check the caller's role.
--   * The `invite-user` Edge Function (service role) is the only INSERT path.

-- ---------------------------------------------------------------------------
-- Enum types (no-op if they already exist, e.g. created via the table editor)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'employee_role') then
    create type public.employee_role as enum ('owner', 'admin', 'staff');
  end if;
  if not exists (select 1 from pg_type where typname = 'employee_status') then
    create type public.employee_status as enum ('invited', 'active', 'suspended');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  full_name       text not null,
  role            public.employee_role not null default 'staff',
  status          public.employee_status not null default 'invited',
  deactivated_at  timestamptz,
  deactivated_by  uuid references public.employees (id) on delete set null,
  created_by      uuid references public.employees (id) on delete set null,
  avatar          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists employees_role_idx on public.employees (role);
create index if not exists employees_status_idx on public.employees (status);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies never trust a stale JWT role)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role::text from public.employees where id = auth.uid();
$$;

create or replace function public.is_active_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.employees
    where id = auth.uid()
      and status = 'active'
  );
$$;

revoke execute on function public.get_my_role() from public, anon;
revoke execute on function public.is_active_member() from public, anon;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_active_member() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.employees enable row level security;

-- Read your own row (even while suspended, so the app can route to /unauthorized).
drop policy if exists select_own_profile on public.employees;
create policy select_own_profile
  on public.employees
  for select
  to authenticated
  using (id = auth.uid());

-- Read the whole team list — admin and owner only.
drop policy if exists select_team on public.employees;
create policy select_team
  on public.employees
  for select
  to authenticated
  using (public.get_my_role() in ('owner', 'admin') and public.is_active_member());

-- Edit your own profile. Column privileges (below) limit this to
-- full_name / avatar, so role & status cannot be changed here.
drop policy if exists update_own_profile on public.employees;
create policy update_own_profile
  on public.employees
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Purge — owner only. The RPC `owner_purge_member` is the intended path; this
-- policy is defense-in-depth for direct deletes.
drop policy if exists delete_purge_owner on public.employees;
create policy delete_purge_owner
  on public.employees
  for delete
  to authenticated
  using (public.get_my_role() = 'owner' and public.is_active_member());

-- No INSERT policy on purpose: rows are created by the invite-user Edge
-- Function with the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Column privileges: direct UPDATE is limited to non-sensitive columns.
-- Role/status changes happen only through the RPCs below (definer = owner).
-- ---------------------------------------------------------------------------
revoke update on public.employees from authenticated;
grant update (full_name, avatar, updated_at) on public.employees to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: admin_update_member_status  (owner + admin)
--   owner may suspend/reactivate admins and staff; admin may only touch staff.
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_member_status(
  member_id uuid,
  new_status public.employee_status
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role  text;
  target_role public.employee_role;
  result      public.employees;
begin
  actor_role := public.get_my_role();

  if actor_role not in ('owner', 'admin') or not public.is_active_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- 'invited' is only set at creation; this RPC handles activate/suspend.
  if new_status = 'invited' then
    raise exception 'invalid status transition' using errcode = '22023';
  end if;

  select role into target_role from public.employees where id = member_id;
  if not found then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  if target_role = 'owner' then
    raise exception 'cannot modify the owner' using errcode = '42501';
  end if;

  if actor_role = 'admin' and target_role <> 'staff' then
    raise exception 'admins can only manage staff' using errcode = '42501';
  end if;

  update public.employees
     set status         = new_status,
         deactivated_at = case when new_status = 'suspended' then now() else null end,
         deactivated_by = case when new_status = 'suspended' then auth.uid() else null end
   where id = member_id
   returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: owner_update_member_role  (owner only)
--   Promote/demote staff <-> admin. Cannot change your own or the owner's role.
-- ---------------------------------------------------------------------------
create or replace function public.owner_update_member_role(
  member_id uuid,
  new_role public.employee_role
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.employee_role;
  result      public.employees;
begin
  if public.get_my_role() <> 'owner' or not public.is_active_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if member_id = auth.uid() then
    raise exception 'cannot change your own role' using errcode = '42501';
  end if;

  select role into target_role from public.employees where id = member_id;
  if not found then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  if target_role = 'owner' then
    raise exception 'cannot change the owner role' using errcode = '42501';
  end if;

  update public.employees
     set role = new_role
   where id = member_id
   returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: owner_purge_member  (owner only)
--   Hard delete an archived member, clearing soft references first.
-- ---------------------------------------------------------------------------
create or replace function public.owner_purge_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.employee_role;
begin
  if public.get_my_role() <> 'owner' or not public.is_active_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if member_id = auth.uid() then
    raise exception 'cannot purge yourself' using errcode = '42501';
  end if;

  select role into target_role from public.employees where id = member_id;
  if not found then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  if target_role = 'owner' then
    raise exception 'cannot purge the owner' using errcode = '42501';
  end if;

  update public.employees set created_by     = null where created_by     = member_id;
  update public.employees set deactivated_by = null where deactivated_by = member_id;

  delete from public.employees where id = member_id;
end;
$$;

revoke execute on function public.admin_update_member_status(uuid, public.employee_status) from public, anon;
revoke execute on function public.owner_update_member_role(uuid, public.employee_role) from public, anon;
revoke execute on function public.owner_purge_member(uuid) from public, anon;

grant execute on function public.admin_update_member_status(uuid, public.employee_status) to authenticated;
grant execute on function public.owner_update_member_role(uuid, public.employee_role) to authenticated;
grant execute on function public.owner_purge_member(uuid) to authenticated;
