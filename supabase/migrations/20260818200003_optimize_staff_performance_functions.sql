-- Phase 14: rewrite get_staff_performance/get_route_performance from 6 correlated
-- scalar subqueries per output row to single-pass aggregation. Each source table
-- (invoices, collections, outstanding, returns) is pre-aggregated to one row per
-- staff/route in its own CTE first, then LEFT JOINed together - that pre-aggregation
-- is what avoids the classic join-fan-out bug (joining raw, un-aggregated rows from
-- multiple one-to-many sources would multiply sums incorrectly), so this is not a
-- plain join-then-group-by rewrite. Return type and column order are unchanged from
-- the original (20260817800001_staff_performance_functions.sql) - verified against
-- the exact figures already checked live in Phase 9/10 before shipping this.

create or replace function public.get_staff_performance(p_from date, p_to date)
returns table (
  staff_id uuid,
  staff_name text,
  total_sales numeric,
  credit_sales numeric,
  invoice_count bigint,
  customer_count bigint,
  total_collection numeric,
  total_outstanding numeric,
  sales_return_total numeric,
  profit_total numeric,
  collected_0_15 numeric,
  collected_16_30 numeric,
  collected_31_45 numeric,
  collected_46_60 numeric,
  collected_61_90 numeric,
  collected_90_plus numeric
)
language sql
security invoker
set search_path = public
as $$
  with staff_invoices as (
    select
      si.staff_id,
      sum(si.total_amount) as total_sales,
      sum(si.total_amount) filter (where si.sale_type = 'credit') as credit_sales,
      count(si.id) as invoice_count,
      count(distinct si.customer_id) as customer_count,
      sum(si.profit_total) as profit_total
    from public.sales_invoices si
    where si.status = 'active' and si.invoice_date between p_from and p_to
    group by si.staff_id
  ),
  collections as (
    select
      si.staff_id,
      sum(ral.amount_allocated) as total_collection,
      sum(ral.amount_allocated) filter (where (r.receipt_date - si.invoice_date) between 0 and 15) as collected_0_15,
      sum(ral.amount_allocated) filter (where (r.receipt_date - si.invoice_date) between 16 and 30) as collected_16_30,
      sum(ral.amount_allocated) filter (where (r.receipt_date - si.invoice_date) between 31 and 45) as collected_31_45,
      sum(ral.amount_allocated) filter (where (r.receipt_date - si.invoice_date) between 46 and 60) as collected_46_60,
      sum(ral.amount_allocated) filter (where (r.receipt_date - si.invoice_date) between 61 and 90) as collected_61_90,
      sum(ral.amount_allocated) filter (where (r.receipt_date - si.invoice_date) > 90) as collected_90_plus
    from public.receipt_allocations ral
    join public.receipts r on r.id = ral.receipt_id and r.status = 'active'
    join public.sales_invoices si on si.id = ral.sales_invoice_id and si.status = 'active'
    where r.receipt_date between p_from and p_to
    group by si.staff_id
  ),
  outstanding as (
    select si.staff_id, sum(sio.outstanding_amount) as total_outstanding
    from public.sales_invoice_outstanding sio
    join public.sales_invoices si on si.id = sio.invoice_id
    where sio.status = 'active' and si.invoice_date between p_from and p_to
    group by si.staff_id
  ),
  returns as (
    select si.staff_id, sum(cn.total_amount) as sales_return_total
    from public.credit_notes cn
    join public.sales_invoices si on si.id = cn.sales_invoice_id
    where cn.status = 'active' and cn.credit_note_date between p_from and p_to
    group by si.staff_id
  )
  select
    up.id,
    up.full_name,
    coalesce(sinv.total_sales, 0),
    coalesce(sinv.credit_sales, 0),
    coalesce(sinv.invoice_count, 0),
    coalesce(sinv.customer_count, 0),
    coalesce(c.total_collection, 0),
    coalesce(o.total_outstanding, 0),
    coalesce(rt.sales_return_total, 0),
    coalesce(sinv.profit_total, 0),
    coalesce(c.collected_0_15, 0),
    coalesce(c.collected_16_30, 0),
    coalesce(c.collected_31_45, 0),
    coalesce(c.collected_46_60, 0),
    coalesce(c.collected_61_90, 0),
    coalesce(c.collected_90_plus, 0)
  from public.user_profiles up
  left join staff_invoices sinv on sinv.staff_id = up.id
  left join collections c on c.staff_id = up.id
  left join outstanding o on o.staff_id = up.id
  left join returns rt on rt.staff_id = up.id
  where sinv.staff_id is not null or c.staff_id is not null
  order by up.full_name;
$$;

create or replace function public.get_route_performance(p_from date, p_to date)
returns table (
  route_id uuid,
  route_name text,
  total_sales numeric,
  total_collection numeric,
  total_outstanding numeric,
  customer_count bigint,
  profit_total numeric
)
language sql
security invoker
set search_path = public
as $$
  with route_invoices as (
    select
      si.route_id,
      sum(si.total_amount) as total_sales,
      count(distinct si.customer_id) as customer_count,
      sum(si.profit_total) as profit_total
    from public.sales_invoices si
    where si.status = 'active' and si.invoice_date between p_from and p_to and si.route_id is not null
    group by si.route_id
  ),
  collections as (
    select si.route_id, sum(ral.amount_allocated) as total_collection
    from public.receipt_allocations ral
    join public.receipts r on r.id = ral.receipt_id and r.status = 'active'
    join public.sales_invoices si on si.id = ral.sales_invoice_id and si.status = 'active' and si.route_id is not null
    where r.receipt_date between p_from and p_to
    group by si.route_id
  ),
  outstanding as (
    select si.route_id, sum(sio.outstanding_amount) as total_outstanding
    from public.sales_invoice_outstanding sio
    join public.sales_invoices si on si.id = sio.invoice_id
    where sio.status = 'active' and si.invoice_date between p_from and p_to and si.route_id is not null
    group by si.route_id
  )
  select
    rt.id,
    rt.name,
    coalesce(ri.total_sales, 0),
    coalesce(c.total_collection, 0),
    coalesce(o.total_outstanding, 0),
    coalesce(ri.customer_count, 0),
    coalesce(ri.profit_total, 0)
  from public.routes rt
  left join route_invoices ri on ri.route_id = rt.id
  left join collections c on c.route_id = rt.id
  left join outstanding o on o.route_id = rt.id
  where ri.route_id is not null or c.route_id is not null
  order by rt.name;
$$;
