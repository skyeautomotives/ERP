-- Phase 6: how much of each invoice is still unpaid. security_invoker so RLS on
-- the underlying tables still applies. This is the data Phase 7's Customer/Supplier
-- Ledger will read from - same "build the ledger source now, report on it next
-- phase" pattern as stock_transactions -> product_stock_levels.

create view public.sales_invoice_outstanding
with (security_invoker = true) as
select
  si.id as invoice_id,
  si.invoice_number,
  si.customer_id,
  si.status,
  si.total_amount,
  coalesce(ra.paid_amount, 0) as paid_amount,
  si.total_amount - coalesce(ra.paid_amount, 0) as outstanding_amount
from public.sales_invoices si
left join (
  select r.customer_id, ral.sales_invoice_id, sum(ral.amount_allocated) as paid_amount
  from public.receipt_allocations ral
  join public.receipts r on r.id = ral.receipt_id
  where r.status = 'active'
  group by r.customer_id, ral.sales_invoice_id
) ra on ra.sales_invoice_id = si.id;

create view public.purchase_invoice_outstanding
with (security_invoker = true) as
select
  pi.id as invoice_id,
  pi.our_reference_number,
  pi.supplier_id,
  pi.status,
  pi.total_amount,
  coalesce(pa.paid_amount, 0) as paid_amount,
  pi.total_amount - coalesce(pa.paid_amount, 0) as outstanding_amount
from public.purchase_invoices pi
left join (
  select p.supplier_id, pal.purchase_invoice_id, sum(pal.amount_allocated) as paid_amount
  from public.payment_allocations pal
  join public.payments p on p.id = pal.payment_id
  where p.status = 'active'
  group by p.supplier_id, pal.purchase_invoice_id
) pa on pa.purchase_invoice_id = pi.id;
