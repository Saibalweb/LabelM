-- LabelM — snapshot the recording employee's name on invoice_payments.
--
-- `received_by` (uuid FK) is stamped by the insert trigger, but the employees
-- table is only readable by owner/admin (select_team RLS), so embedding
-- `employees(full_name)` returned null for staff. Store the name at write time
-- so every active member sees who recorded a payment, and the value survives a
-- later rename or purge of the employee row.

alter table public.invoice_payments
  add column if not exists received_by_name text;

-- Backfill existing payments from the current employee name.
update public.invoice_payments p
set received_by_name = e.full_name
from public.employees e
where p.received_by = e.id
  and p.received_by_name is null;

create or replace function public.invoice_payments_set_received_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.received_by = auth.uid();
  select e.full_name into new.received_by_name
  from public.employees e
  where e.id = auth.uid();
  return new;
end;
$$;
