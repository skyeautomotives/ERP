-- Phase 7 fix: create_sales_invoice/create_purchase_invoice insert the header
-- row first with zero totals, then run a separate UPDATE (status unchanged)
-- that fills in the real totals once all line items are processed. The
-- original triggers posted on INSERT and never re-fired for that finalizing
-- UPDATE, so sales/purchase journal entries were landing with the right
-- accounts but zero amounts. Re-point posting to the totals-going-from-zero
-- moment instead, and repair any bad entries already posted by the old logic.

create or replace function public.post_sales_invoice_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_gst_amt numeric;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'active' and coalesce(NEW.total_amount, 0) <> 0)
     or (TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'active'
         and coalesce(OLD.total_amount, 0) = 0 and coalesce(NEW.total_amount, 0) <> 0) then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.invoice_date, 'Sales Invoice ' || NEW.invoice_number, 'sales_invoices', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('1100'), NEW.total_amount, 0),
      (v_entry_id, public.coa_id('4000'), 0, coalesce(NEW.taxable_total, 0)),
      (v_entry_id, public.coa_id('2100'), 0, v_gst_amt);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Sales Invoice ' || NEW.invoice_number, 'sales_invoices', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('1100'), 0, NEW.total_amount),
      (v_entry_id, public.coa_id('4000'), coalesce(NEW.taxable_total, 0), 0),
      (v_entry_id, public.coa_id('2100'), v_gst_amt, 0);
  end if;
  return NEW;
end;
$$;

create or replace function public.post_purchase_invoice_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_gst_amt numeric;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'active' and coalesce(NEW.total_amount, 0) <> 0)
     or (TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'active'
         and coalesce(OLD.total_amount, 0) = 0 and coalesce(NEW.total_amount, 0) <> 0) then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.supplier_invoice_date, 'Purchase ' || NEW.our_reference_number, 'purchase_invoices', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('1200'), coalesce(NEW.taxable_total, 0), 0),
      (v_entry_id, public.coa_id('1300'), v_gst_amt, 0),
      (v_entry_id, public.coa_id('2000'), 0, NEW.total_amount);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Purchase ' || NEW.our_reference_number, 'purchase_invoices', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('1200'), 0, coalesce(NEW.taxable_total, 0)),
      (v_entry_id, public.coa_id('1300'), 0, v_gst_amt),
      (v_entry_id, public.coa_id('2000'), NEW.total_amount, 0);
  end if;
  return NEW;
end;
$$;

-- Repair: delete any sales/purchase journal entries the old buggy trigger
-- already posted with all-zero line amounts, then re-derive correct entries
-- for those invoices using the same logic as the Phase 7 backfill migration.
delete from public.journal_entry_lines
where entry_id in (
  select je.id
  from public.journal_entries je
  where je.source_table in ('sales_invoices', 'purchase_invoices')
    and not exists (
      select 1 from public.journal_entry_lines jel
      where jel.entry_id = je.id and (jel.debit_amount <> 0 or jel.credit_amount <> 0)
    )
);

delete from public.journal_entries je
where je.source_table in ('sales_invoices', 'purchase_invoices')
  and not exists (select 1 from public.journal_entry_lines jel where jel.entry_id = je.id);

with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select si.invoice_date, 'Sales Invoice ' || si.invoice_number, 'sales_invoices', si.id, si.created_by
  from public.sales_invoices si
  where si.status = 'active'
    and not exists (select 1 from public.journal_entries je where je.source_table = 'sales_invoices' and je.source_id = si.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.sales_invoices si on si.id = ins.source_id
cross join lateral (
  values
    (public.coa_id('1100'), si.total_amount, 0::numeric),
    (public.coa_id('4000'), 0::numeric, coalesce(si.taxable_total, 0)),
    (public.coa_id('2100'), 0::numeric, coalesce(si.cgst_total, 0) + coalesce(si.sgst_total, 0) + coalesce(si.igst_total, 0))
) as v(account_id, debit_amount, credit_amount);

with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select pi.supplier_invoice_date, 'Purchase ' || pi.our_reference_number, 'purchase_invoices', pi.id, pi.created_by
  from public.purchase_invoices pi
  where pi.status = 'active'
    and not exists (select 1 from public.journal_entries je where je.source_table = 'purchase_invoices' and je.source_id = pi.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.purchase_invoices pi on pi.id = ins.source_id
cross join lateral (
  values
    (public.coa_id('1200'), coalesce(pi.taxable_total, 0), 0::numeric),
    (public.coa_id('1300'), coalesce(pi.cgst_total, 0) + coalesce(pi.sgst_total, 0) + coalesce(pi.igst_total, 0), 0::numeric),
    (public.coa_id('2000'), 0::numeric, pi.total_amount)
) as v(account_id, debit_amount, credit_amount);
