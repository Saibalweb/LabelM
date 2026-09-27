-- LabelM — user-selectable invoice due date.
--
-- Why this exists
--   * Invoice generation previously hardcoded due_date = period_end + 30.
--     The due date is now chosen at generation time and threaded through as
--     p_due_date. It is anchored on the generation (issue) date, independent
--     of the billing period.
--   * A null p_due_date falls back to current_date + 30 to preserve the old
--     default shape and keep direct/manual RPC calls working.
--
-- Note: Postgres cannot change a function signature with CREATE OR REPLACE, so
-- the old 3-arg / 2-arg versions must be dropped before the new ones are made.
-- Dropping also avoids an ambiguous overload once a 4th argument exists.

drop function if exists public.generate_invoice_for_customer(integer, date, date);
drop function if exists public.generate_invoices_for_period(date, date);

-- ---------------------------------------------------------------------------
-- RPC: generate_invoice_for_customer(p_customer_id, p_period_start,
--                                    p_period_end, p_due_date)
--   Creates ONE invoice for the customer from its unbilled labels in the
--   period. Returns exactly one row; `skipped` is set (and invoice_* null)
--   when nothing is created:
--     'overlap'   -> an invoice already covers part of the period
--     'no_labels' -> no unbilled labels in the period
-- ---------------------------------------------------------------------------
create or replace function public.generate_invoice_for_customer(
  p_customer_id  integer,
  p_period_start date,
  p_period_end   date,
  p_due_date     date
)
returns table (
  customer_id    integer,
  customer_name  text,
  invoice_id     integer,
  invoice_number text,
  label_count    bigint,
  total_amount   numeric,
  total_weight   numeric,
  skipped        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_name  text;
  v_label_count    bigint;
  v_total_amount   numeric(12,2);
  v_total_weight   numeric(12,2);
  v_invoice_number text;
  v_invoice_id     integer;
begin
  if not public.is_active_member() or public.get_my_role() not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_period_end <= p_period_start then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  select c.name into v_customer_name
  from public.customers c
  where c.id = p_customer_id and c.deleted_at is null;

  if not found then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  -- Already billed for an overlapping period -> skip.
  if exists (
    select 1
    from public.invoices i
    where i.customer_id = p_customer_id
      and daterange(i.period_start, i.period_end, '[)')
          && daterange(p_period_start, p_period_end, '[)')
  ) then
    return query
      select p_customer_id, v_customer_name, null::integer, null::text,
             0::bigint, 0::numeric, 0::numeric, 'overlap'::text;
    return;
  end if;

  select count(*), coalesce(sum(l.amount), 0), coalesce(sum(l.weight), 0)
    into v_label_count, v_total_amount, v_total_weight
  from public.labels l
  where l.customer_id = p_customer_id
    and l.invoice_id is null
    and l.label_date >= p_period_start
    and l.label_date < p_period_end;

  if v_label_count = 0 then
    return query
      select p_customer_id, v_customer_name, null::integer, null::text,
             0::bigint, 0::numeric, 0::numeric, 'no_labels'::text;
    return;
  end if;

  v_invoice_number := public.next_document_number('invoice', 'INV', 4);

  insert into public.invoices (
    invoice_number, customer_id, period_start, period_end,
    total_amount, total_weight, status, due_date
  )
  values (
    v_invoice_number, p_customer_id, p_period_start, p_period_end,
    v_total_amount, v_total_weight, 'Unpaid',
    coalesce(p_due_date, current_date + 30)
  )
  returning id into v_invoice_id;

  -- Lock the billed labels. The labels_lock_billed trigger allows this because
  -- old.invoice_id is still null at this point.
  update public.labels l
     set invoice_id = v_invoice_id,
         status     = 'printed'
   where l.customer_id = p_customer_id
     and l.invoice_id is null
     and l.label_date >= p_period_start
     and l.label_date < p_period_end;

  return query
    select p_customer_id, v_customer_name, v_invoice_id, v_invoice_number,
           v_label_count, v_total_amount, v_total_weight, null::text;
end;
$$;

revoke execute on function public.generate_invoice_for_customer(integer, date, date, date) from public, anon;
grant execute on function public.generate_invoice_for_customer(integer, date, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: generate_invoices_for_period(p_period_start, p_period_end, p_due_date)
--   Bulk: one invoice per active customer that has unbilled labels in the
--   period. Returns a row per attempted customer (created or skipped). The
--   same due date is applied to every invoice in the run.
-- ---------------------------------------------------------------------------
create or replace function public.generate_invoices_for_period(
  p_period_start date,
  p_period_end   date,
  p_due_date     date
)
returns table (
  customer_id    integer,
  customer_name  text,
  invoice_id     integer,
  invoice_number text,
  label_count    bigint,
  total_amount   numeric,
  total_weight   numeric,
  skipped        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  if not public.is_active_member() or public.get_my_role() not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_period_end <= p_period_start then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  for c in
    select distinct l.customer_id as id
    from public.labels l
    join public.customers cu on cu.id = l.customer_id
    where l.invoice_id is null
      and l.label_date >= p_period_start
      and l.label_date < p_period_end
      and cu.deleted_at is null
    order by l.customer_id
  loop
    return query
      select *
      from public.generate_invoice_for_customer(c.id, p_period_start, p_period_end, p_due_date);
  end loop;
end;
$$;

revoke execute on function public.generate_invoices_for_period(date, date, date) from public, anon;
grant execute on function public.generate_invoices_for_period(date, date, date) to authenticated;

notify pgrst, 'reload schema';
