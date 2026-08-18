-- Phase 11: the Dashboard's "today" snapshot (spec section 40). Flow figures
-- (sales/purchase/collection/expenses/profit) are filtered to p_date; point-in-time
-- figures (cash/bank balance, outstanding, stock value, low stock) are always
-- current as of today, since the UI never exposes a past-date picker for the
-- dashboard - documented here rather than adding unused date-bounding logic.

create or replace function public.get_dashboard_summary(p_date date default current_date)
returns table (
  today_sales numeric,
  today_purchase numeric,
  today_collection numeric,
  today_expenses numeric,
  cash_balance numeric,
  bank_balance numeric,
  customer_outstanding numeric,
  supplier_outstanding numeric,
  stock_value numeric,
  low_stock_count bigint,
  gross_profit numeric,
  cost_total numeric
)
language sql
security invoker
set search_path = public
as $$
  select
    (select coalesce(sum(si.total_amount), 0) from public.sales_invoices si
      where si.status = 'active' and si.invoice_date = p_date),
    (select coalesce(sum(pi.total_amount), 0) from public.purchase_invoices pi
      where pi.status = 'active' and pi.supplier_invoice_date = p_date),
    (select coalesce(sum(ral.amount_allocated), 0)
      from public.receipt_allocations ral join public.receipts r on r.id = ral.receipt_id
      where r.status = 'active' and r.receipt_date = p_date),
    (select coalesce(sum(pay.amount), 0) from public.payments pay
      where pay.purpose = 'expense' and pay.status = 'active' and pay.payment_date = p_date),
    (select coalesce(sum(jel.debit_amount) - sum(jel.credit_amount), 0)
      from public.journal_entry_lines jel
      join public.journal_entries je on je.id = jel.entry_id
      join public.chart_of_accounts coa on coa.id = jel.account_id
      where coa.code = '1000' and je.entry_date <= p_date),
    (select coalesce(sum(jel.debit_amount) - sum(jel.credit_amount), 0)
      from public.journal_entry_lines jel
      join public.journal_entries je on je.id = jel.entry_id
      join public.chart_of_accounts coa on coa.id = jel.account_id
      where coa.code = '1010' and je.entry_date <= p_date),
    (select coalesce(sum(sio.outstanding_amount), 0) from public.sales_invoice_outstanding sio
      where sio.status = 'active'),
    (select coalesce(sum(pio.outstanding_amount), 0) from public.purchase_invoice_outstanding pio
      where pio.status = 'active'),
    (select coalesce(sum(psl.stock_value), 0) from public.product_stock_levels psl
      where psl.is_active = true),
    (select count(*) from public.product_stock_levels psl
      where psl.is_active = true and psl.min_stock_level > 0 and psl.current_qty <= psl.min_stock_level),
    (select coalesce(sum(si.profit_total), 0) from public.sales_invoices si
      where si.status = 'active' and si.invoice_date = p_date),
    (select coalesce(sum(si.cost_total), 0) from public.sales_invoices si
      where si.status = 'active' and si.invoice_date = p_date);
$$;
