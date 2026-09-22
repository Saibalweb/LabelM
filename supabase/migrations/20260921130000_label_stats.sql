-- LabelM — server-side dashboard aggregates + sort/filter indexes.
--
-- Purpose
--   * The dashboard moves from client-side filtering (which fetched the whole
--     labels table) to server-side filtering + pagination. The stat cards and
--     the filter sheet's range hints / per-customer counts were previously
--     derived from the full in-memory list, which is impossible once the list
--     is paginated.
--   * label_stats()           -> single-row aggregates for the stat cards and
--                                the min/max weight & amount range hints.
--   * label_counts_by_customer() -> per-customer label counts for the filter
--                                sheet ("#N labels").
--   * Both run as SECURITY INVOKER so the existing RLS select policy
--     (is_active_member) still applies; no data leaks beyond the read policy.
--   * Additional indexes back the new server-side sort/filter columns.

-- ---------------------------------------------------------------------------
-- RPC: label_stats()
--   Returns totals across ALL labels (global, filter-agnostic).
--   COALESCE keeps empty tables at 0 rather than NULL.
-- ---------------------------------------------------------------------------
create or replace function public.label_stats()
returns table (
  total_labels bigint,
  total_weight numeric,
  min_weight   numeric,
  max_weight   numeric,
  min_amount   numeric,
  max_amount   numeric,
  print_queue  bigint
)
language sql
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(sum(weight), 0),
    coalesce(min(weight), 0),
    coalesce(max(weight), 0),
    coalesce(min(amount), 0),
    coalesce(max(amount), 0),
    count(*) filter (where status = 'draft')::bigint
  from public.labels;
$$;

revoke execute on function public.label_stats() from public, anon;
grant execute on function public.label_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: label_counts_by_customer()
--   Returns customer_id -> label count for the whole table.
-- ---------------------------------------------------------------------------
create or replace function public.label_counts_by_customer()
returns table (
  customer_id integer,
  label_count bigint
)
language sql
set search_path = public
as $$
  select customer_id, count(*)::bigint
  from public.labels
  group by customer_id;
$$;

revoke execute on function public.label_counts_by_customer() from public, anon;
grant execute on function public.label_counts_by_customer() to authenticated;

-- ---------------------------------------------------------------------------
-- Indexes for the dashboard's server-side sort/filter columns
-- ---------------------------------------------------------------------------
create index if not exists labels_amount_idx on public.labels (amount);
create index if not exists labels_weight_idx on public.labels (weight);