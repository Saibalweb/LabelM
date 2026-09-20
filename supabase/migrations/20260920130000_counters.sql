-- LabelM — counters table + next_document_number RPC.
--
-- Purpose
--   * Atomic, collision-proof sequential document numbers (labels today,
--     invoices later). labels.sl_no is `text not null unique`, so the
--     next value must be allocated safely even with concurrent inserts.
--   * The number is assigned server-side: INSERT ... ON CONFLICT takes a
--     row lock on the counters row, so concurrent callers serialize.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.counters (
  kind       text primary key,
  last_value bigint not null default 0
);

-- Direct client access is not needed; only the SECURITY DEFINER function
-- below touches this table.
alter table public.counters enable row level security;

-- ---------------------------------------------------------------------------
-- RPC: next_document_number(kind, prefix, digits)
--   Returns e.g. 'LBL-0001'. prefix and digits default to label conventions.
-- ---------------------------------------------------------------------------
create or replace function public.next_document_number(
  kind text,
  prefix text default 'LBL',
  digits integer default 4
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value bigint;
begin
  insert into public.counters (kind, last_value)
  values (next_document_number.kind, 1)
  on conflict (kind)
  do update set last_value = public.counters.last_value + 1
  returning last_value into next_value;

  return next_document_number.prefix || '-' || lpad(next_value::text, next_document_number.digits, '0');
end;
$$;

revoke execute on function public.next_document_number(text, text, integer) from public, anon;
grant execute on function public.next_document_number(text, text, integer) to authenticated;