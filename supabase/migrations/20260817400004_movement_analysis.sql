-- Phase 5: fast/slow moving products (section 19) - total quantity sold per
-- product over a trailing window, aggregated in SQL rather than pulled client-side
-- (section 54's "don't load whole tables into the browser" guidance).

create or replace function public.get_movement_analysis(p_days int)
returns table (
  product_id uuid,
  code text,
  name text,
  total_sold numeric
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
    coalesce(sum(-st.quantity_change), 0) as total_sold
  from public.products p
  left join public.stock_transactions st
    on st.product_id = p.id
    and st.transaction_type = 'sale'
    and st.created_at >= now() - (p_days || ' days')::interval
  where p.is_active = true
  group by p.id, p.code, p.name
  order by total_sold desc;
$$;

revoke all on function public.get_movement_analysis(int) from public;
grant execute on function public.get_movement_analysis(int) to authenticated;
