-- Phase 9: Staff + Sales Performance + Collection Performance (spec sections
-- 28-31). Pure reporting - no new tables, every figure is derived from
-- existing sales_invoices/receipt_allocations/credit_notes/routes data.
-- Ageing buckets reuse the exact 0-15/16-30/31-45/46-60/61-90/90+ boundaries
-- already used for Bill-wise Outstanding (Phase 7) - not Phase 10's slightly
-- different incentive-slab boundaries.

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
    select si.id, si.staff_id, si.customer_id, si.sale_type, si.total_amount, si.profit_total, si.invoice_date
    from public.sales_invoices si
    where si.status = 'active' and si.invoice_date between p_from and p_to
  ),
  collections as (
    select si.staff_id, ral.amount_allocated, (r.receipt_date - si.invoice_date) as days_taken
    from public.receipt_allocations ral
    join public.receipts r on r.id = ral.receipt_id and r.status = 'active'
    join public.sales_invoices si on si.id = ral.sales_invoice_id and si.status = 'active'
    where r.receipt_date between p_from and p_to
  ),
  outstanding as (
    select si.staff_id, sio.outstanding_amount
    from public.sales_invoice_outstanding sio
    join public.sales_invoices si on si.id = sio.invoice_id
    where sio.status = 'active' and si.invoice_date between p_from and p_to
  ),
  returns as (
    select si.staff_id, cn.total_amount
    from public.credit_notes cn
    join public.sales_invoices si on si.id = cn.sales_invoice_id
    where cn.status = 'active' and cn.credit_note_date between p_from and p_to
  )
  select
    up.id,
    up.full_name,
    coalesce(sum(si.total_amount), 0),
    coalesce(sum(si.total_amount) filter (where si.sale_type = 'credit'), 0),
    count(si.id),
    count(distinct si.customer_id),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id), 0),
    coalesce((select sum(o.outstanding_amount) from outstanding o where o.staff_id = up.id), 0),
    coalesce((select sum(rt.total_amount) from returns rt where rt.staff_id = up.id), 0),
    coalesce(sum(si.profit_total), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id and c.days_taken between 0 and 15), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id and c.days_taken between 16 and 30), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id and c.days_taken between 31 and 45), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id and c.days_taken between 46 and 60), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id and c.days_taken between 61 and 90), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id and c.days_taken > 90), 0)
  from public.user_profiles up
  left join staff_invoices si on si.staff_id = up.id
  where up.id in (select staff_id from staff_invoices union select staff_id from collections)
  group by up.id, up.full_name
  order by up.full_name;
$$;

create or replace function public.get_collection_detail(p_from date, p_to date)
returns table (
  staff_name text,
  customer_name text,
  invoice_number text,
  invoice_date date,
  invoice_amount numeric,
  due_date date,
  payment_date date,
  collection_amount numeric,
  days_taken int,
  collection_status text
)
language sql
security invoker
set search_path = public
as $$
  select
    up.full_name,
    c.name,
    si.invoice_number,
    si.invoice_date,
    si.total_amount,
    si.due_date,
    r.receipt_date,
    ral.amount_allocated,
    (r.receipt_date - si.invoice_date),
    case
      when (r.receipt_date - si.invoice_date) <= 15 then '0-15 days'
      when (r.receipt_date - si.invoice_date) <= 30 then '16-30 days'
      when (r.receipt_date - si.invoice_date) <= 45 then '31-45 days'
      when (r.receipt_date - si.invoice_date) <= 60 then '46-60 days'
      when (r.receipt_date - si.invoice_date) <= 90 then '61-90 days'
      else '90+ days'
    end
  from public.receipt_allocations ral
  join public.receipts r on r.id = ral.receipt_id and r.status = 'active'
  join public.sales_invoices si on si.id = ral.sales_invoice_id and si.status = 'active' and si.sale_type = 'credit'
  left join public.user_profiles up on up.id = si.staff_id
  left join public.customers c on c.id = si.customer_id
  where r.receipt_date between p_from and p_to
  order by r.receipt_date, si.invoice_number;
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
    select si.id, si.route_id, si.customer_id, si.total_amount, si.profit_total
    from public.sales_invoices si
    where si.status = 'active' and si.invoice_date between p_from and p_to and si.route_id is not null
  ),
  collections as (
    select si.route_id, ral.amount_allocated
    from public.receipt_allocations ral
    join public.receipts r on r.id = ral.receipt_id and r.status = 'active'
    join public.sales_invoices si on si.id = ral.sales_invoice_id and si.status = 'active' and si.route_id is not null
    where r.receipt_date between p_from and p_to
  ),
  outstanding as (
    select si.route_id, sio.outstanding_amount
    from public.sales_invoice_outstanding sio
    join public.sales_invoices si on si.id = sio.invoice_id
    where sio.status = 'active' and si.invoice_date between p_from and p_to and si.route_id is not null
  )
  select
    rt.id,
    rt.name,
    coalesce(sum(ri.total_amount), 0),
    coalesce((select sum(c.amount_allocated) from collections c where c.route_id = rt.id), 0),
    coalesce((select sum(o.outstanding_amount) from outstanding o where o.route_id = rt.id), 0),
    count(distinct ri.customer_id),
    coalesce(sum(ri.profit_total), 0)
  from public.routes rt
  left join route_invoices ri on ri.route_id = rt.id
  where rt.id in (select route_id from route_invoices union select route_id from collections)
  group by rt.id, rt.name
  order by rt.name;
$$;

create or replace function public.get_route_staff_breakdown(p_from date, p_to date)
returns table (
  route_name text,
  staff_name text,
  sales_total numeric,
  invoice_count bigint
)
language sql
security invoker
set search_path = public
as $$
  select rt.name, up.full_name, sum(si.total_amount), count(si.id)
  from public.sales_invoices si
  join public.routes rt on rt.id = si.route_id
  left join public.user_profiles up on up.id = si.staff_id
  where si.status = 'active' and si.invoice_date between p_from and p_to
  group by rt.name, up.full_name
  order by rt.name, up.full_name;
$$;
