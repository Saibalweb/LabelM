-- LabelM — company profile, app settings, invoice document snapshots, and
-- bulk mark-printed support.
--
-- Design
--   * company_profile (singleton): business identity used on printed
--     documents (label + invoice headers). phones is a JSONB array of
--     { id, label, value, showOnLabel, showOnInvoice } objects so each number
--     can be flagged per document. showOnLabel is exclusive (enforced by the
--     UI); showOnInvoice is multi.
--   * app_settings (singleton): workspace behavior — label size preset and
--     dimensions, document prefixes, and per-document display toggles
--     (label_options / invoice_options JSONB blobs). Display toggles are not
--     queried, so JSONB avoids a migration per toggle.
--   * Label dimensions are capped to the 4x6in (101.6 x 152.4 mm) ceiling of
--     the reference Zebra ZT411 (4.09in print width). The constraint is
--     orientation-safe: the short edge <= 101.6 and the long edge <= 152.4.
--   * Invoices gain company_snapshot / customer_snapshot JSONB so historical
--     documents keep their legal header even if the profile changes later.
--     Display toggles (invoice_options) intentionally stay live.
--   * mark_labels_printed flips drafts to printed for unbilled labels only.
--     `invoice_id is null` sidesteps the labels_lock_billed trigger.
--
-- RLS: both settings tables are readable by any active member and writable by
-- owner/admin only.

-- ---------------------------------------------------------------------------
-- company_profile (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.company_profile (
  id             smallint primary key default 1 check (id = 1),
  company_name   text not null default 'My Company',
  tagline        text,
  address        text,
  contact_person text,
  phones         jsonb not null default '[]'::jsonb,
  email          text,
  website        text,
  gst_number     text,
  logo_url       text,
  created_by     uuid references public.employees (id) on delete set null,
  updated_by     uuid references public.employees (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists company_profile_set_updated_at on public.company_profile;
create trigger company_profile_set_updated_at
  before update on public.company_profile
  for each row
  execute function public.set_updated_at();

drop trigger if exists company_profile_set_audit_fields on public.company_profile;
create trigger company_profile_set_audit_fields
  before insert or update on public.company_profile
  for each row
  execute function public.set_audit_fields();

alter table public.company_profile enable row level security;

drop policy if exists company_profile_select on public.company_profile;
create policy company_profile_select
  on public.company_profile
  for select
  to authenticated
  using (public.is_active_member());

drop policy if exists company_profile_insert on public.company_profile;
create policy company_profile_insert
  on public.company_profile
  for insert
  to authenticated
  with check (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  );

drop policy if exists company_profile_update on public.company_profile;
create policy company_profile_update
  on public.company_profile
  for update
  to authenticated
  using (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  )
  with check (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  );

drop policy if exists company_profile_delete on public.company_profile;
create policy company_profile_delete
  on public.company_profile
  for delete
  to authenticated
  using (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  );

insert into public.company_profile (id, company_name)
values (1, 'My Company')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- app_settings (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                smallint primary key default 1 check (id = 1),
  label_preset      text not null default '60x40',
  label_width_mm    numeric(6, 2) not null default 60,
  label_height_mm   numeric(6, 2) not null default 40,
  label_prefix      text not null default 'LBL',
  invoice_prefix    text not null default 'INV',
  auto_mark_printed boolean not null default false,
  label_options     jsonb not null default
    '{"showCompanyName":true,"showCustomerName":true,"showSlNo":true,"showDate":true,"showWeight":true,"showAmount":true,"showRate":false,"showPhone":false,"showAddress":false}'::jsonb,
  invoice_options   jsonb not null default
    '{"showTagline":true,"showAddress":true,"showGst":true,"showPhones":true,"showEmail":true,"showWebsite":false,"showContactPerson":false,"showDueDate":true}'::jsonb,
  created_by        uuid references public.employees (id) on delete set null,
  updated_by        uuid references public.employees (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint app_settings_label_width_positive check (label_width_mm > 0),
  constraint app_settings_label_height_positive check (label_height_mm > 0),
  constraint app_settings_label_size_within_4x6 check (
    least(label_width_mm, label_height_mm) <= 101.6
    and greatest(label_width_mm, label_height_mm) <= 152.4
  )
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists app_settings_set_audit_fields on public.app_settings;
create trigger app_settings_set_audit_fields
  before insert or update on public.app_settings
  for each row
  execute function public.set_audit_fields();

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select
  on public.app_settings
  for select
  to authenticated
  using (public.is_active_member());

drop policy if exists app_settings_insert on public.app_settings;
create policy app_settings_insert
  on public.app_settings
  for insert
  to authenticated
  with check (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  );

drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update
  on public.app_settings
  for update
  to authenticated
  using (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  )
  with check (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  );

drop policy if exists app_settings_delete on public.app_settings;
create policy app_settings_delete
  on public.app_settings
  for delete
  to authenticated
  using (
    public.is_active_member()
    and public.get_my_role() in ('owner', 'admin')
  );

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Invoice document snapshots
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists company_snapshot jsonb,
  add column if not exists customer_snapshot jsonb;

-- ---------------------------------------------------------------------------
-- RPC: mark_labels_printed(p_ids)
--   Flips draft, unbilled labels to 'printed' and returns the affected count.
--   `invoice_id is null` keeps the labels_lock_billed trigger from firing.
-- ---------------------------------------------------------------------------
create or replace function public.mark_labels_printed(p_ids integer[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_active_member() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;

  update public.labels
     set status = 'printed'
   where id = any (p_ids)
     and invoice_id is null
     and status = 'draft';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.mark_labels_printed(integer[]) from public, anon;
grant execute on function public.mark_labels_printed(integer[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Recreate generate_invoice_for_customer (4-arg) to:
--   * read invoice_prefix from app_settings (fallback 'INV')
--   * snapshot the company profile + full customer row onto the invoice
-- The signature is unchanged, so the bulk wrapper keeps working. CREATE OR
-- REPLACE cannot rename params, but none change here.
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
  v_customer_name    text;
  v_label_count      bigint;
  v_total_amount     numeric(12,2);
  v_total_weight     numeric(12,2);
  v_invoice_number   text;
  v_invoice_id       integer;
  v_invoice_prefix   text;
  v_company_snapshot jsonb;
  v_customer_snapshot jsonb;
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

  select coalesce(invoice_prefix, 'INV') into v_invoice_prefix
  from public.app_settings where id = 1;
  v_invoice_prefix := coalesce(v_invoice_prefix, 'INV');

  select jsonb_build_object(
           'name', cp.company_name,
           'tagline', cp.tagline,
           'address', cp.address,
           'contactPerson', cp.contact_person,
           'phones', cp.phones,
           'email', cp.email,
           'website', cp.website,
           'gstNumber', cp.gst_number,
           'logoUrl', cp.logo_url
         )
    into v_company_snapshot
  from public.company_profile cp
  where cp.id = 1;

  select jsonb_build_object(
           'name', c.name,
           'address', c.address,
           'email', c.email,
           'phone', c.phone,
           'gstNumber', c.gst_number
         )
    into v_customer_snapshot
  from public.customers c
  where c.id = p_customer_id;

  v_invoice_number := public.next_document_number('invoice', v_invoice_prefix, 4);

  insert into public.invoices (
    invoice_number, customer_id, period_start, period_end,
    total_amount, total_weight, status, due_date,
    company_snapshot, customer_snapshot
  )
  values (
    v_invoice_number, p_customer_id, p_period_start, p_period_end,
    v_total_amount, v_total_weight, 'Unpaid',
    coalesce(p_due_date, current_date + 30),
    v_company_snapshot, v_customer_snapshot
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

notify pgrst, 'reload schema';
