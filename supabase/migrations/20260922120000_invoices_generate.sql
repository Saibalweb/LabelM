-- LabelM — server-side invoice generation (single + bulk) and payment status sync.
--
-- Why this exists
--   * Invoice generation is a multi-table transaction: allocate a number from
--     counters, insert the invoice, and flip every unbilled label's invoice_id
--     in the SAME transaction. A client cannot do this safely (partial writes,
--     number collisions, bypassing the owner/admin rule via the labels_update
--     RLS policy). Doing it here keeps it atomic, collision-proof, role-checked
--     and consistent.
--   * Billing periods are half-open: [period_start, period_end). Labels are
--     matched with label_date >= start AND label_date < end.
--   * Bulk generation is one invoice PER CUSTOMER (never a mixed invoice).
--   * Customers already billed for an overlapping period are skipped.

-- ---------------------------------------------------------------------------
-- Guard: one invoice per customer per exact period (defense in depth; the
-- functions below already skip overlaps, which is a broader check).
-- ---------------------------------------------------------------------------
create unique index if not exists invoices_customer_period_uniq
  on public.invoices (customer_id, period_start, period_end);

-- ---------------------------------------------------------------------------
-- RPC: invoice_generation_preview(p_period_start, p_period_end)
--   Aggregates only — one row per active customer that has unbilled labels in
--   the period. No label rows are shipped to the client. has_overlap flags
--   customers that will be skipped because an invoice already covers part of
--   the period.
-- ---------------------------------------------------------------------------
create or replace function public.invoice_generation_preview(
  p_period_start date,
  p_period_end date
)
returns table (
  customer_id   integer,
  customer_name text,
  label_count   bigint,
  total_weight  numeric,
  total_amount  numeric,
  has_overlap   boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_member() or public.get_my_role() not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_period_end <= p_period_start then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  return query
    select
      c.id,
      c.name,
      count(l.id)::bigint,
      coalesce(sum(l.weight), 0),
      coalesce(sum(l.amount), 0),
      exists (
        select 1
        from public.invoices i
        where i.customer_id = c.id
          and daterange(i.period_start, i.period_end, '[)')
              && daterange(p_period_start, p_period_end, '[)')
      )
    from public.labels l
    join public.customers c on c.id = l.customer_id
    where l.invoice_id is null
      and l.label_date >= p_period_start
      and l.label_date < p_period_end
      and c.deleted_at is null
    group by c.id, c.name
    order by c.name;
end;
$$;

revoke execute on function public.invoice_generation_preview(date, date) from public, anon;
grant execute on function public.invoice_generation_preview(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: generate_invoice_for_customer(p_customer_id, p_period_start, p_period_end)
--   Creates ONE invoice for the customer from its unbilled labels in the
--   period. Returns exactly one row; `skipped` is set (and invoice_* null)
--   when nothing is created:
--     'overlap'   -> an invoice already covers part of the period
--     'no_labels' -> no unbilled labels in the period
-- ---------------------------------------------------------------------------
create or replace function public.generate_invoice_for_customer(
  p_customer_id  integer,
  p_period_start date,
  p_period_end   date
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
    v_total_amount, v_total_weight, 'Unpaid', p_period_end + 30
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

revoke execute on function public.generate_invoice_for_customer(integer, date, date) from public, anon;
grant execute on function public.generate_invoice_for_customer(integer, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: generate_invoices_for_period(p_period_start, p_period_end)
--   Bulk: one invoice per active customer that has unbilled labels in the
--   period. Returns a row per attempted customer (created or skipped).
-- ---------------------------------------------------------------------------
create or replace function public.generate_invoices_for_period(
  p_period_start date,
  p_period_end   date
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
      from public.generate_invoice_for_customer(c.id, p_period_start, p_period_end);
  end loop;
end;
$$;

revoke execute on function public.generate_invoices_for_period(date, date) from public, anon;
grant execute on function public.generate_invoices_for_period(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Payment status sync
--   Keeps invoices.status (Paid / Unpaid / Partial) in step with the sum of
--   invoice_payments. Runs after any payment insert/update/delete.
-- ---------------------------------------------------------------------------
create or replace function public.invoices_recalc_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id integer;
  v_total      numeric(12,2);
  v_paid       numeric(12,2);
  v_status     text;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select total_amount into v_total from public.invoices where id = v_invoice_id;
  if v_total is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.invoice_payments
  where invoice_id = v_invoice_id;

  if v_paid <= 0 then
    v_status := 'Unpaid';
  elsif v_paid >= v_total then
    v_status := 'Paid';
  else
    v_status := 'Partial';
  end if;

  update public.invoices set status = v_status where id = v_invoice_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_payments_recalc_status on public.invoice_payments;
create trigger invoice_payments_recalc_status
  after insert or update or delete on public.invoice_payments
  for each row
  execute function public.invoices_recalc_status();
