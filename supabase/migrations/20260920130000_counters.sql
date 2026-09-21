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
-- RPC: next_document_number(p_kind, p_prefix, p_digits)
--   Returns e.g. 'LBL-0001'. p_prefix and p_digits default to label conventions.
--   Parameters are prefixed with p_ so they never collide with the `kind` /
--   `last_value` columns — a bare `kind` reference is what caused the 42702
--   "column reference is ambiguous" error before.
--   DROP is required (not just OR REPLACE) so this migration is re-runnable
--   after the earlier broken version that used `kind` as a parameter name —
--   Postgres refuses to rename input parameters via CREATE OR REPLACE.
-- ---------------------------------------------------------------------------
drop function if exists public.next_document_number(text, text, integer);

create function public.next_document_number(
  p_kind text,
  p_prefix text default 'LBL',
  p_digits integer default 4
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
  values (p_kind, 1)
  on conflict (kind)
  do update set last_value = public.counters.last_value + 1
  returning last_value into next_value;

  return p_prefix || '-' || lpad(next_value::text, p_digits, '0');
end;
$$;

revoke execute on function public.next_document_number(text, text, integer) from public, anon;
grant execute on function public.next_document_number(text, text, integer) to authenticated;