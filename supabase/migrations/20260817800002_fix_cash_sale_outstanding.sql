-- Fix: cash sales were incorrectly showing up as "outstanding". A cash sale
-- is paid in full at the point of sale and never goes through the receipts
-- flow, but sales_invoice_outstanding (Phase 6) and get_customer_ledger
-- (Phase 7) both computed outstanding/billed off ALL sales_invoices
-- regardless of sale_type, and post_sales_invoice_journal (Phase 7) posted
-- every sale - cash or credit - as a debit to Accounts Receivable. The result:
-- every cash sale silently sat as a permanent, uncollectable "receivable" in
-- the ledger and on Bill-wise Outstanding/Customer Ledger. Caught while
-- building Phase 9's staff outstanding figures (a staff member's outstanding
-- total included their cash sales, which should never happen), traced back
-- to its actual root in Phase 6/7. No real cash sale data existed in the
-- database at the time this was found, so no backfill/repair is needed -
-- only the three functions below.

create or replace view public.sales_invoice_outstanding
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
) ra on ra.sales_invoice_id = si.id
where si.sale_type = 'credit';

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

create or replace function public.post_sales_invoice_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_gst_amt numeric;
  v_debit_account uuid;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'active' and coalesce(NEW.total_amount, 0) <> 0)
     or (TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'active'
         and coalesce(OLD.total_amount, 0) = 0 and coalesce(NEW.total_amount, 0) <> 0) then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);
    v_debit_account := case when NEW.sale_type = 'cash' then public.coa_id('1000') else public.coa_id('1100') end;

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.invoice_date, 'Sales Invoice ' || NEW.invoice_number, 'sales_invoices', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, v_debit_account, NEW.total_amount, 0),
      (v_entry_id, public.coa_id('4000'), 0, coalesce(NEW.taxable_total, 0)),
      (v_entry_id, public.coa_id('2100'), 0, v_gst_amt);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);
    v_debit_account := case when NEW.sale_type = 'cash' then public.coa_id('1000') else public.coa_id('1100') end;

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Sales Invoice ' || NEW.invoice_number, 'sales_invoices', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, v_debit_account, 0, NEW.total_amount),
      (v_entry_id, public.coa_id('4000'), coalesce(NEW.taxable_total, 0), 0),
      (v_entry_id, public.coa_id('2100'), v_gst_amt, 0);
  end if;
  return NEW;
end;
$$;
