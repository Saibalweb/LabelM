-- LabelM — hide history of soft-deleted customers; owner/admin can restore.
--
-- Why this exists
--   * Soft-deleting a customer must not surface half-blank records: once a
--     customer is archived, ALL of their labels, invoices and payments become
--     invisible to everyone (the data stays fully preserved in the DB).
--   * Owner/admin can list archived customers and restore them, which brings
--     every historical record back.
--   * Defense in depth: the customers table can no longer be soft-deleted via a
--     plain UPDATE (deletion is only possible through soft_delete_customer),
--     and direct hard-deletes are owner/admin only.

-- ---------------------------------------------------------------------------
-- 1. Hide history of deleted customers (labels / invoices / payments)
-- ---------------------------------------------------------------------------
drop policy if exists labels_select on public.labels;
create policy labels_select
  on public.labels
  for select
  to authenticated
  using (
    public.is_active_member()
    and exists (
      select 1 from public.customers c
      where c.id = public.labels.customer_id
        and c.deleted_at is null
    )
  );

drop policy if exists invoices_select on public.invoices;
create policy invoices_select
  on public.invoices
  for select
  to authenticated
  using (
    public.is_active_member()
    and exists (
      select 1 from public.customers c
      where c.id = public.invoices.customer_id
        and c.deleted_at is null
    )
  );

drop policy if exists invoice_payments_select on public.invoice_payments;
create policy invoice_payments_select
  on public.invoice_payments
  for select
  to authenticated
  using (
    public.is_active_member()
    and exists (
      select 1
      from public.invoices i
      join public.customers c on c.id = i.customer_id
      where i.id = public.invoice_payments.invoice_id
        and c.deleted_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- 2. RPC: list_deleted_customers()
--   Owner/admin only. Returns archived customers with audit details.
-- ---------------------------------------------------------------------------
create or replace function public.list_deleted_customers()
returns table (
  id              integer,
  name            text,
  address         text,
  phone           text,
  email           text,
  gst_number      text,
  deleted_at      timestamptz,
  deleted_by      uuid,
  deleted_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_member() or public.get_my_role() not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select c.id, c.name, c.address, c.phone, c.email, c.gst_number,
           c.deleted_at, c.deleted_by, e.full_name
    from public.customers c
    left join public.employees e on e.id = c.deleted_by
    where c.deleted_at is not null
    order by c.deleted_at desc, c.id desc;
end;
$$;

revoke execute on function public.list_deleted_customers() from public, anon;
grant execute on function public.list_deleted_customers() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: restore_customer(p_customer_id)
--   Owner/admin only. Clears deleted_at / deleted_by; all history becomes
--   visible again (the tightened SELECT policies above re-allow reads).
-- ---------------------------------------------------------------------------
create or replace function public.restore_customer(p_customer_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_member() or public.get_my_role() not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.customers
     set deleted_at = null,
         deleted_by = null
   where id = p_customer_id;
end;
$$;

revoke execute on function public.restore_customer(integer) from public, anon;
grant execute on function public.restore_customer(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Defense in depth
--   * Soft-delete is only possible through soft_delete_customer (owner/admin).
--     A plain table UPDATE may never leave deleted_at set (the row would also
--     become invisible to the read policy, which is exactly the failure we are
--     routing around).
--   * Direct hard-deletes are owner/admin only.
-- ---------------------------------------------------------------------------
drop policy if exists customers_update on public.customers;
create policy customers_update
  on public.customers
  for update
  to authenticated
  using (public.is_active_member() and deleted_at is null)
  with check (public.is_active_member() and deleted_at is null);

drop policy if exists customers_delete on public.customers;
create policy customers_delete
  on public.customers
  for delete
  to authenticated
  using (public.is_active_member() and public.get_my_role() in ('owner', 'admin'));