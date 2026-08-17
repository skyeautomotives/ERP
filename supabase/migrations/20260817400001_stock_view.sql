-- Phase 5: current-stock view. security_invoker means this view runs with the
-- querying user's own RLS on products/stock_transactions, not the view owner's -
-- so permission checks still apply even though it reads across two tables.

create view public.product_stock_levels
with (security_invoker = true) as
select
  p.id as product_id,
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
  group by product_id
) st on st.product_id = p.id;
