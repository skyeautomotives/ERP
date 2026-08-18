-- Phase 14: real bug found by the new e2e sales-return test (not previously
-- caught because no earlier phase's verification combined "create invoice +
-- return part of it + check outstanding" in one pass). The general ledger
-- (journal_entries, account 1100/1200) already reverses the receivable/payable
-- correctly via post_credit_note_journal/post_debit_note_journal - so Trial
-- Balance and Balance Sheet were always right. But sales_invoice_outstanding /
-- purchase_invoice_outstanding (the per-invoice source used by Bill-wise
-- Outstanding, the receipt/payment allocation picker, and ageing) and
-- get_customer_ledger / get_supplier_ledger never subtracted credit/debit
-- notes at all - a customer who returned goods still showed as owing the full
-- original invoice amount everywhere except the company-wide Trial Balance.

-- Matches the actual current definitions from 20260817800004_fix_outstanding_view_embeds.sql
-- (drop+create, not create-or-replace, since the denormalized column list there
-- doesn't match the original Phase 6 shape and create-or-replace requires an
-- identical column list) - only the outstanding_amount expression changes.
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
  si.total_amount - coalesce(ra.paid_amount, 0) - coalesce(cn.returned_amount, 0) as outstanding_amount
from public.sales_invoices si
join public.customers c on c.id = si.customer_id
left join (
  select r.customer_id, ral.sales_invoice_id, sum(ral.amount_allocated) as paid_amount
  from public.receipt_allocations ral
  join public.receipts r on r.id = ral.receipt_id
  where r.status = 'active'
  group by r.customer_id, ral.sales_invoice_id
) ra on ra.sales_invoice_id = si.id
left join (
  select sales_invoice_id, sum(total_amount) as returned_amount
  from public.credit_notes
  where status = 'active'
  group by sales_invoice_id
) cn on cn.sales_invoice_id = si.id
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
  pi.total_amount - coalesce(pa.paid_amount, 0) - coalesce(dn.returned_amount, 0) as outstanding_amount
from public.purchase_invoices pi
join public.suppliers s on s.id = pi.supplier_id
left join (
  select p.supplier_id, pal.purchase_invoice_id, sum(pal.amount_allocated) as paid_amount
  from public.payment_allocations pal
  join public.payments p on p.id = pal.payment_id
  where p.status = 'active'
  group by p.supplier_id, pal.purchase_invoice_id
) pa on pa.purchase_invoice_id = pi.id
left join (
  select purchase_invoice_id, sum(total_amount) as returned_amount
  from public.debit_notes
  where status = 'active'
  group by purchase_invoice_id
) dn on dn.purchase_invoice_id = pi.id;

notify pgrst, 'reload schema';

create or replace function public.get_customer_ledger(p_customer_id uuid, p_as_of_date date default current_date)
returns table (
  txn_date date,
  particulars text,
  ref_type text,
  ref_id uuid,
  billed numeric,
  received numeric,
  running_balance numeric
)
language sql
security invoker
set search_path = public
as $$
  with txns as (
    select
      c.created_at::date as txn_date,
      'Opening balance'::text as particulars,
      'opening'::text as ref_type,
      c.id as ref_id,
      case when c.opening_balance_type = 'debit' then c.opening_balance else 0 end as billed,
      case when c.opening_balance_type = 'credit' then c.opening_balance else 0 end as received,
      0 as sort_order
    from public.customers c
    where c.id = p_customer_id

    union all

    select si.invoice_date, 'Sales Invoice ' || si.invoice_number, 'sales_invoice', si.id, si.total_amount, 0, 1
    from public.sales_invoices si
    where si.customer_id = p_customer_id and si.status = 'active' and si.sale_type = 'credit'
      and si.invoice_date <= p_as_of_date

    union all

    select cn.credit_note_date, 'Credit Note ' || cn.credit_note_number, 'credit_note', cn.id, 0, cn.total_amount, 2
    from public.credit_notes cn
    where cn.customer_id = p_customer_id and cn.status = 'active' and cn.credit_note_date <= p_as_of_date

    union all

    select r.receipt_date, 'Receipt ' || r.receipt_number, 'receipt', r.id, 0, r.amount, 3
    from public.receipts r
    where r.customer_id = p_customer_id and r.status = 'active' and r.receipt_date <= p_as_of_date
  )
  select
    t.txn_date, t.particulars, t.ref_type, t.ref_id, t.billed, t.received,
    sum(t.billed - t.received) over (order by t.txn_date, t.sort_order, t.ref_id rows unbounded preceding) as running_balance
  from txns t
  order by t.txn_date, t.sort_order, t.ref_id;
$$;

create or replace function public.get_supplier_ledger(p_supplier_id uuid, p_as_of_date date default current_date)
returns table (
  txn_date date,
  particulars text,
  ref_type text,
  ref_id uuid,
  billed numeric,
  paid numeric,
  running_balance numeric
)
language sql
security invoker
set search_path = public
as $$
  with txns as (
    select
      s.created_at::date as txn_date,
      'Opening balance'::text as particulars,
      'opening'::text as ref_type,
      s.id as ref_id,
      case when s.opening_balance_type = 'credit' then s.opening_balance else 0 end as billed,
      case when s.opening_balance_type = 'debit' then s.opening_balance else 0 end as paid,
      0 as sort_order
    from public.suppliers s
    where s.id = p_supplier_id

    union all

    select pi.supplier_invoice_date, 'Purchase ' || pi.our_reference_number, 'purchase_invoice', pi.id, pi.total_amount, 0, 1
    from public.purchase_invoices pi
    where pi.supplier_id = p_supplier_id and pi.status = 'active' and pi.supplier_invoice_date <= p_as_of_date

    union all

    select dn.debit_note_date, 'Debit Note ' || dn.debit_note_number, 'debit_note', dn.id, 0, dn.total_amount, 2
    from public.debit_notes dn
    where dn.supplier_id = p_supplier_id and dn.status = 'active' and dn.debit_note_date <= p_as_of_date

    union all

    select p.payment_date, 'Payment ' || p.payment_number, 'payment', p.id, 0, p.amount, 3
    from public.payments p
    where p.supplier_id = p_supplier_id and p.status = 'active' and p.payment_date <= p_as_of_date
  )
  select
    t.txn_date, t.particulars, t.ref_type, t.ref_id, t.billed, t.paid,
    sum(t.billed - t.paid) over (order by t.txn_date, t.sort_order, t.ref_id rows unbounded preceding) as running_balance
  from txns t
  order by t.txn_date, t.sort_order, t.ref_id;
$$;
