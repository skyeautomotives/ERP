-- Phase 5: stock as of a past date (covers "opening/closing stock" from section 19
-- without a separate report - it's the same shape as product_stock_levels, just
-- summing stock_transactions up to a chosen date instead of all of them).

create or replace function public.get_stock_as_of(p_as_of_date date)
returns table (
  product_id uuid,
  code text,
  name text,
  brand text,
  product_group text,
  product_sub_group text,
  unit text,
  opening_qty numeric,
  min_stock_level numeric,
  max_stock_level numeric,
  is_active boolean,
  current_qty numeric,
  unit_cost numeric,
  stock_value numeric
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    p.id,
    p.code,
    p.name,
    p.brand,
    p.product_group,
    p.product_sub_group,
    p.unit,
    p.opening_qty,
    p.min_stock_level,
    p.max_stock_level,
    p.is_active,
    coalesce(p.opening_qty, 0) + coalesce(st.total_change, 0) as current_qty,
    coalesce(p.landing_cost, p.purchase_rate, 0) as unit_cost,
    (coalesce(p.opening_qty, 0) + coalesce(st.total_change, 0)) * coalesce(p.landing_cost, p.purchase_rate, 0) as stock_value
  from public.products p
  left join (
    select product_id, sum(quantity_change) as total_change
    from public.stock_transactions
    where created_at::date <= p_as_of_date
    group by product_id
  ) st on st.product_id = p.id;
$$;

revoke all on function public.get_stock_as_of(date) from public;
grant execute on function public.get_stock_as_of(date) to authenticated;
