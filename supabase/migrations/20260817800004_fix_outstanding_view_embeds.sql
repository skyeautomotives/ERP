-- Fix: PostgREST cannot auto-detect an embeddable foreign-key relationship
-- from a VIEW to its underlying base table (confirmed with a control test -
-- even the untouched purchase_invoice_outstanding fails the same way, so
-- this predates today's changes and has been broken since Phase 6/7 shipped
-- it - .from("sales_invoice_outstanding").select("*, sales_invoices(...)")
-- has been silently returning PGRST200 errors this whole time, which
-- next.js turned into an empty array rather than a visible crash, so
-- Bill-wise Outstanding has always rendered "Nothing outstanding" regardless
-- of real data. Fix: denormalize the columns the UI needs directly onto the
-- views instead of relying on embedding through them.

drop view if exists public.sales_invoice_outstanding;

create view public.sales_invoice_outstanding
with (security_invoker = true) as
select
  si.id as invoice_id,
  si.invoice_number,
  si.customer_id,
  c.name as customer_name,
  si.invoice_date,
  si.due_date,
  si.status,
  si.total_amount,
  coalesce(ra.paid_amount, 0) as paid_amount,
  si.total_amount - coalesce(ra.paid_amount, 0) as outstanding_amount
from public.sales_invoices si
join public.customers c on c.id = si.customer_id
left join (
  select r.customer_id, ral.sales_invoice_id, sum(ral.amount_allocated) as paid_amount
  from public.receipt_allocations ral
  join public.receipts r on r.id = ral.receipt_id
  where r.status = 'active'
  group by r.customer_id, ral.sales_invoice_id
) ra on ra.sales_invoice_id = si.id
where si.sale_type = 'credit';

drop view if exists public.purchase_invoice_outstanding;

create view public.purchase_invoice_outstanding
with (security_invoker = true) as
select
  pi.id as invoice_id,
  pi.our_reference_number,
  pi.supplier_id,
  s.name as supplier_name,
  pi.supplier_invoice_date,
  (pi.supplier_invoice_date + (s.credit_period_days || ' days')::interval)::date as due_date,
  pi.status,
  pi.total_amount,
  coalesce(pa.paid_amount, 0) as paid_amount,
  pi.total_amount - coalesce(pa.paid_amount, 0) as outstanding_amount
from public.purchase_invoices pi
join public.suppliers s on s.id = pi.supplier_id
left join (
  select p.supplier_id, pal.purchase_invoice_id, sum(pal.amount_allocated) as paid_amount
  from public.payment_allocations pal
  join public.payments p on p.id = pal.payment_id
  where p.status = 'active'
  group by p.supplier_id, pal.purchase_invoice_id
) pa on pa.purchase_invoice_id = pi.id;

notify pgrst, 'reload schema';
