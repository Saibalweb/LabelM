-- LabelM — soft-delete customers via a SECURITY DEFINER RPC.
--
-- Why this exists
--   * The previous soft-delete (client `UPDATE ... SET deleted_at`) fails with
--     42501 "new row violates row-level security policy for table customers".
--     PostgREST's UPDATE read-back is itself subject to RLS, and the SELECT
--     policy (`deleted_at is null`) can never pass for the just-soft-deleted
--     row, so the operation is rejected even for active members.
--   * This RPC runs as the function owner (which bypasses RLS) and performs the
--     same soft-delete, so members can mark customers deleted without loosening
--     the read policy. Authorization is enforced explicitly via
--     is_active_member().

create or replace function public.soft_delete_customer(p_customer_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.customers
     set deleted_at = now(),
         deleted_by = auth.uid()
   where id = p_customer_id
     and deleted_at is null;
end;
$$;

revoke execute on function public.soft_delete_customer(integer) from public, anon;
grant execute on function public.soft_delete_customer(integer) to authenticated;