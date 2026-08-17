-- Phase 7: one-time backfill. The triggers in the previous migration only fire
-- on new inserts/updates going forward - anything already in the database
-- (including the user's own real pre-Phase-7 data) needs these entries posted
-- once, by hand, using the identical debit/credit logic as the triggers.
-- Guarded by "does a journal_entries row already exist for this source" so
-- this is safe to re-run. Only active/non-zero rows are backfilled - a
-- cancelled invoice never had net financial impact, so it's skipped entirely
-- rather than posted-then-reversed.

-- Sales invoices
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

-- Purchase invoices
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

-- Receipts
with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select r.receipt_date, 'Receipt ' || r.receipt_number, 'receipts', r.id, r.created_by
  from public.receipts r
  where r.status = 'active'
    and not exists (select 1 from public.journal_entries je where je.source_table = 'receipts' and je.source_id = r.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.receipts r on r.id = ins.source_id
cross join lateral (
  values
    (case when r.method = 'cash' then public.coa_id('1000') else public.coa_id('1010') end, r.amount, 0::numeric),
    (public.coa_id('1100'), 0::numeric, r.amount)
) as v(account_id, debit_amount, credit_amount);

-- Payments
with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select p.payment_date, 'Payment ' || p.payment_number, 'payments', p.id, p.created_by
  from public.payments p
  where p.status = 'active'
    and not exists (select 1 from public.journal_entries je where je.source_table = 'payments' and je.source_id = p.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.payments p on p.id = ins.source_id
cross join lateral (
  values
    (case when p.purpose = 'expense' then public.coa_id('5100') else public.coa_id('2000') end, p.amount, 0::numeric),
    (case when p.method = 'cash' then public.coa_id('1000') else public.coa_id('1010') end, 0::numeric, p.amount)
) as v(account_id, debit_amount, credit_amount);

-- Stock adjustments (insert-only, always backfilled regardless of any status)
with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select sa.created_at::date, 'Stock Adjustment - ' || sa.reason, 'stock_adjustments', sa.id, sa.created_by
  from public.stock_adjustments sa
  where not exists (select 1 from public.journal_entries je where je.source_table = 'stock_adjustments' and je.source_id = sa.id)
    and abs(sa.quantity_change) * coalesce((select coalesce(landing_cost, purchase_rate, 0) from public.products pr where pr.id = sa.product_id), 0) <> 0
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.stock_adjustments sa on sa.id = ins.source_id
join public.products pr on pr.id = sa.product_id
cross join lateral (
  values
    (case when sa.quantity_change > 0 then public.coa_id('1200') else public.coa_id('5200') end,
      abs(sa.quantity_change) * coalesce(pr.landing_cost, pr.purchase_rate, 0), 0::numeric),
    (case when sa.quantity_change > 0 then public.coa_id('5200') else public.coa_id('1200') end,
      0::numeric, abs(sa.quantity_change) * coalesce(pr.landing_cost, pr.purchase_rate, 0))
) as v(account_id, debit_amount, credit_amount);

-- Customer opening balances
with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select c.created_at::date, 'Opening balance - ' || c.name, 'customers', c.id, c.created_by
  from public.customers c
  where coalesce(c.opening_balance, 0) <> 0
    and not exists (select 1 from public.journal_entries je where je.source_table = 'customers' and je.source_id = c.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.customers c on c.id = ins.source_id
cross join lateral (
  values
    (case when c.opening_balance_type = 'debit' then public.coa_id('1100') else public.coa_id('3000') end, c.opening_balance, 0::numeric),
    (case when c.opening_balance_type = 'debit' then public.coa_id('3000') else public.coa_id('1100') end, 0::numeric, c.opening_balance)
) as v(account_id, debit_amount, credit_amount);

-- Supplier opening balances
with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select s.created_at::date, 'Opening balance - ' || s.name, 'suppliers', s.id, s.created_by
  from public.suppliers s
  where coalesce(s.opening_balance, 0) <> 0
    and not exists (select 1 from public.journal_entries je where je.source_table = 'suppliers' and je.source_id = s.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.suppliers s on s.id = ins.source_id
cross join lateral (
  values
    (case when s.opening_balance_type = 'credit' then public.coa_id('3000') else public.coa_id('2000') end, s.opening_balance, 0::numeric),
    (case when s.opening_balance_type = 'credit' then public.coa_id('2000') else public.coa_id('3000') end, 0::numeric, s.opening_balance)
) as v(account_id, debit_amount, credit_amount);

-- Product opening stock value
with ins as (
  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  select p.created_at::date, 'Opening stock - ' || p.name, 'products', p.id, p.created_by
  from public.products p
  where coalesce(p.opening_value, 0) <> 0
    and not exists (select 1 from public.journal_entries je where je.source_table = 'products' and je.source_id = p.id)
  returning id, source_id
)
insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount)
select ins.id, v.account_id, v.debit_amount, v.credit_amount
from ins
join public.products p on p.id = ins.source_id
cross join lateral (
  values
    (public.coa_id('1200'), p.opening_value, 0::numeric),
    (public.coa_id('3000'), 0::numeric, p.opening_value)
) as v(account_id, debit_amount, credit_amount);
