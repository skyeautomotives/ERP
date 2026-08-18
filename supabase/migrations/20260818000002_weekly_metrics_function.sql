-- Phase 11: weekly graph data (spec section 41) - 7 rows, Monday through
-- Sunday starting at p_week_start. Called twice from the page (this week's
-- Monday, and 7 days earlier) to power the "compare with previous week"
-- requirement as a second bar series, rather than a separate parameter here.

create or replace function public.get_weekly_metrics(p_week_start date)
returns table (
  day_date date,
  sales_total numeric,
  collection_total numeric,
  purchase_total numeric,
  profit_total numeric
)
language sql
security invoker
set search_path = public
as $$
  select
    (p_week_start + i)::date as day_date,
    coalesce((select sum(si.total_amount) from public.sales_invoices si
      where si.status = 'active' and si.invoice_date = (p_week_start + i)::date), 0),
    coalesce((select sum(ral.amount_allocated)
      from public.receipt_allocations ral join public.receipts r on r.id = ral.receipt_id
      where r.status = 'active' and r.receipt_date = (p_week_start + i)::date), 0),
    coalesce((select sum(pi.total_amount) from public.purchase_invoices pi
      where pi.status = 'active' and pi.supplier_invoice_date = (p_week_start + i)::date), 0),
    coalesce((select sum(si.profit_total) from public.sales_invoices si
      where si.status = 'active' and si.invoice_date = (p_week_start + i)::date), 0)
  from generate_series(0, 6) as i
  order by i;
$$;
