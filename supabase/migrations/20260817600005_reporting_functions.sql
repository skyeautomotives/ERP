-- Phase 7: reporting functions on top of the journal. Same shape as Phase 5's
-- get_stock_as_of/get_movement_analysis - a SQL function returning a table,
-- called with different date parameters to power Trial Balance, P&L, and
-- Balance Sheet from one source, plus per-party running-balance ledgers.

create or replace function public.get_account_balances(p_from_date date default null, p_to_date date default current_date)
returns table (
  account_id uuid,
  code text,
  name text,
  account_type text,
  total_debit numeric,
  total_credit numeric,
  balance numeric
)
language sql
security invoker
set search_path = public
as $$
  select
    coa.id,
    coa.code,
    coa.name,
    coa.account_type,
    coalesce(sum(jel.debit_amount), 0) as total_debit,
    coalesce(sum(jel.credit_amount), 0) as total_credit,
    coalesce(sum(jel.debit_amount) - sum(jel.credit_amount), 0) as balance
  from public.chart_of_accounts coa
  left join (
    select jel2.account_id, jel2.debit_amount, jel2.credit_amount
    from public.journal_entry_lines jel2
    join public.journal_entries je2 on je2.id = jel2.entry_id
    where je2.entry_date <= p_to_date
      and (p_from_date is null or je2.entry_date >= p_from_date)
  ) jel on jel.account_id = coa.id
  group by coa.id, coa.code, coa.name, coa.account_type
  order by coa.code;
$$;

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
    where si.customer_id = p_customer_id and si.status = 'active' and si.invoice_date <= p_as_of_date

    union all

    select r.receipt_date, 'Receipt ' || r.receipt_number, 'receipt', r.id, 0, r.amount, 2
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

    select p.payment_date, 'Payment ' || p.payment_number, 'payment', p.id, 0, p.amount, 2
    from public.payments p
    where p.supplier_id = p_supplier_id and p.status = 'active' and p.payment_date <= p_as_of_date
  )
  select
    t.txn_date, t.particulars, t.ref_type, t.ref_id, t.billed, t.paid,
    sum(t.billed - t.paid) over (order by t.txn_date, t.sort_order, t.ref_id rows unbounded preceding) as running_balance
  from txns t
  order by t.txn_date, t.sort_order, t.ref_id;
$$;
