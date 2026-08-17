-- Phase 10: the Incentive Dashboard (spec section 34). Same architecture as
-- Phase 9's get_staff_performance - one row per staff, correlated subqueries
-- per metric to avoid join fan-out. Collection incentive is looked up per
-- collection event against collection_incentive_slabs by the actual number
-- of days between invoice date and collection date (section 33's own
-- instruction), not a flat rate.

create or replace function public.get_incentive_dashboard(p_from date, p_to date)
returns table (
  staff_id uuid,
  staff_name text,
  total_sales numeric,
  sales_incentive numeric,
  collection_incentive numeric,
  total_incentive numeric,
  target numeric,
  achievement_percent numeric,
  collection_percent numeric,
  avg_collection_days numeric,
  outstanding_generated numeric,
  outstanding_collected numeric,
  outstanding_90_plus numeric
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sales_incentive_rate numeric;
begin
  select coalesce(sales_incentive_rate, 0) into v_sales_incentive_rate
  from public.company_settings limit 1;

  return query
  with staff_invoices as (
    select si.id, si.staff_id, si.sale_type, si.total_amount, si.invoice_date
    from public.sales_invoices si
    where si.status = 'active' and si.invoice_date between p_from and p_to
  ),
  collections as (
    select
      si.staff_id,
      ral.amount_allocated,
      (r.receipt_date - si.invoice_date) as days_taken,
      coalesce(cis.incentive_rate, 0) as slab_rate
    from public.receipt_allocations ral
    join public.receipts r on r.id = ral.receipt_id and r.status = 'active'
    join public.sales_invoices si on si.id = ral.sales_invoice_id and si.status = 'active' and si.sale_type = 'credit'
    left join public.collection_incentive_slabs cis
      on cis.is_active = true
      and (r.receipt_date - si.invoice_date) >= cis.min_days
      and (cis.max_days is null or (r.receipt_date - si.invoice_date) <= cis.max_days)
    where r.receipt_date between p_from and p_to
  ),
  outstanding_90 as (
    select si.staff_id, sio.outstanding_amount
    from public.sales_invoice_outstanding sio
    join public.sales_invoices si on si.id = sio.invoice_id
    where sio.status = 'active' and (current_date - sio.due_date) > 90
  ),
  targets as (
    select staff_id, sum(target_amount) as target_amount
    from public.staff_sales_targets
    where make_date(period_year, period_month, 1) between date_trunc('month', p_from)::date and date_trunc('month', p_to)::date
    group by staff_id
  )
  select
    up.id,
    up.full_name,
    coalesce(sum(si.total_amount), 0) as total_sales,
    round(coalesce(sum(si.total_amount), 0) * v_sales_incentive_rate / 100, 2) as sales_incentive,
    coalesce((select round(sum(c.amount_allocated * c.slab_rate / 100), 2) from collections c where c.staff_id = up.id), 0) as collection_incentive,
    round(coalesce(sum(si.total_amount), 0) * v_sales_incentive_rate / 100, 2)
      + coalesce((select round(sum(c.amount_allocated * c.slab_rate / 100), 2) from collections c where c.staff_id = up.id), 0) as total_incentive,
    (select t.target_amount from targets t where t.staff_id = up.id) as target,
    case
      when (select t.target_amount from targets t where t.staff_id = up.id) > 0
      then round(coalesce(sum(si.total_amount), 0) / (select t.target_amount from targets t where t.staff_id = up.id) * 100, 1)
      else null
    end as achievement_percent,
    case
      when coalesce(sum(si.total_amount) filter (where si.sale_type = 'credit'), 0) > 0
      then round(coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id), 0)
        / coalesce(sum(si.total_amount) filter (where si.sale_type = 'credit'), 0) * 100, 1)
      else null
    end as collection_percent,
    (select round(avg(c.days_taken), 1) from collections c where c.staff_id = up.id) as avg_collection_days,
    coalesce(sum(si.total_amount) filter (where si.sale_type = 'credit'), 0) as outstanding_generated,
    coalesce((select sum(c.amount_allocated) from collections c where c.staff_id = up.id), 0) as outstanding_collected,
    coalesce((select sum(o.outstanding_amount) from outstanding_90 o where o.staff_id = up.id), 0) as outstanding_90_plus
  from public.user_profiles up
  left join staff_invoices si on si.staff_id = up.id
  where up.id in (
    select staff_id from staff_invoices
    union select staff_id from collections
    union select staff_id from outstanding_90
    union select staff_id from targets
  )
  group by up.id, up.full_name
  order by up.full_name;
end;
$$;
