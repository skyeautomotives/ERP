-- Phase 7: automatic double-entry posting. Every money-moving table gets an
-- AFTER INSERT (and, where the table supports cancellation, AFTER UPDATE)
-- trigger that posts a balanced journal entry - mirrors log_audit()'s existing
-- write-through-trigger pattern. No RPC bodies are touched by this migration.

-- ===== Sales invoices =====
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
  if TG_OP = 'INSERT' and NEW.status = 'active' then
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

create trigger sales_invoices_journal
after insert or update on public.sales_invoices
for each row execute function public.post_sales_invoice_journal();

-- ===== Purchase invoices =====
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
  if TG_OP = 'INSERT' and NEW.status = 'active' then
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

create trigger purchase_invoices_journal
after insert or update on public.purchase_invoices
for each row execute function public.post_purchase_invoice_journal();

-- ===== Receipts =====
create or replace function public.post_receipt_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_cash_or_bank uuid;
begin
  v_cash_or_bank := case when NEW.method = 'cash' then public.coa_id('1000') else public.coa_id('1010') end;

  if TG_OP = 'INSERT' and NEW.status = 'active' then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.receipt_date, 'Receipt ' || NEW.receipt_number, 'receipts', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, v_cash_or_bank, NEW.amount, 0),
      (v_entry_id, public.coa_id('1100'), 0, NEW.amount);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Receipt ' || NEW.receipt_number, 'receipts', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, v_cash_or_bank, 0, NEW.amount),
      (v_entry_id, public.coa_id('1100'), NEW.amount, 0);
  end if;
  return NEW;
end;
$$;

create trigger receipts_journal
after insert or update on public.receipts
for each row execute function public.post_receipt_journal();

-- ===== Payments =====
create or replace function public.post_payment_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_cash_or_bank uuid;
  v_other_side uuid;
begin
  v_cash_or_bank := case when NEW.method = 'cash' then public.coa_id('1000') else public.coa_id('1010') end;
  v_other_side := case when NEW.purpose = 'expense' then public.coa_id('5100') else public.coa_id('2000') end;

  if TG_OP = 'INSERT' and NEW.status = 'active' then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.payment_date, 'Payment ' || NEW.payment_number, 'payments', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, v_other_side, NEW.amount, 0),
      (v_entry_id, v_cash_or_bank, 0, NEW.amount);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Payment ' || NEW.payment_number, 'payments', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, v_other_side, 0, NEW.amount),
      (v_entry_id, v_cash_or_bank, NEW.amount, 0);
  end if;
  return NEW;
end;
$$;

create trigger payments_journal
after insert or update on public.payments
for each row execute function public.post_payment_journal();

-- ===== Stock adjustments (insert-only table) =====
create or replace function public.post_stock_adjustment_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_unit_cost numeric;
  v_value numeric;
begin
  select coalesce(landing_cost, purchase_rate, 0) into v_unit_cost
  from public.products where id = NEW.product_id;

  v_value := abs(NEW.quantity_change) * coalesce(v_unit_cost, 0);
  if v_value = 0 then
    return NEW;
  end if;

  insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
  values (NEW.created_at::date, 'Stock Adjustment - ' || NEW.reason, 'stock_adjustments', NEW.id, NEW.created_by)
  returning id into v_entry_id;

  if NEW.quantity_change > 0 then
    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('1200'), v_value, 0),
      (v_entry_id, public.coa_id('5200'), 0, v_value);
  else
    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('5200'), v_value, 0),
      (v_entry_id, public.coa_id('1200'), 0, v_value);
  end if;
  return NEW;
end;
$$;

create trigger stock_adjustments_journal
after insert on public.stock_adjustments
for each row execute function public.post_stock_adjustment_journal();

-- ===== Customer opening balances (insert, or edit of the opening balance later) =====
create or replace function public.post_customer_opening_balance_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_new_signed numeric;
  v_old_signed numeric;
  v_delta numeric;
begin
  v_new_signed := case when NEW.opening_balance_type = 'debit' then NEW.opening_balance else -NEW.opening_balance end;
  v_old_signed := case when TG_OP = 'INSERT' then 0
    else case when OLD.opening_balance_type = 'debit' then OLD.opening_balance else -OLD.opening_balance end end;
  v_delta := coalesce(v_new_signed, 0) - coalesce(v_old_signed, 0);

  if v_delta <> 0 then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Opening balance - ' || NEW.name, 'customers', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    if v_delta > 0 then
      insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
        (v_entry_id, public.coa_id('1100'), v_delta, 0),
        (v_entry_id, public.coa_id('3000'), 0, v_delta);
    else
      insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
        (v_entry_id, public.coa_id('3000'), -v_delta, 0),
        (v_entry_id, public.coa_id('1100'), 0, -v_delta);
    end if;
  end if;
  return NEW;
end;
$$;

create trigger customers_opening_balance_journal
after insert or update of opening_balance, opening_balance_type on public.customers
for each row execute function public.post_customer_opening_balance_journal();

-- ===== Supplier opening balances =====
create or replace function public.post_supplier_opening_balance_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_new_signed numeric;
  v_old_signed numeric;
  v_delta numeric;
begin
  v_new_signed := case when NEW.opening_balance_type = 'credit' then NEW.opening_balance else -NEW.opening_balance end;
  v_old_signed := case when TG_OP = 'INSERT' then 0
    else case when OLD.opening_balance_type = 'credit' then OLD.opening_balance else -OLD.opening_balance end end;
  v_delta := coalesce(v_new_signed, 0) - coalesce(v_old_signed, 0);

  if v_delta <> 0 then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Opening balance - ' || NEW.name, 'suppliers', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    if v_delta > 0 then
      insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
        (v_entry_id, public.coa_id('3000'), v_delta, 0),
        (v_entry_id, public.coa_id('2000'), 0, v_delta);
    else
      insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
        (v_entry_id, public.coa_id('2000'), -v_delta, 0),
        (v_entry_id, public.coa_id('3000'), 0, -v_delta);
    end if;
  end if;
  return NEW;
end;
$$;

create trigger suppliers_opening_balance_journal
after insert or update of opening_balance, opening_balance_type on public.suppliers
for each row execute function public.post_supplier_opening_balance_journal();

-- ===== Product opening stock value (same idea - opening_value predates the
-- ledger and needs to land in Inventory the same way opening_balance lands in AR/AP) =====
create or replace function public.post_product_opening_value_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_delta numeric;
begin
  v_delta := coalesce(NEW.opening_value, 0) - case when TG_OP = 'INSERT' then 0 else coalesce(OLD.opening_value, 0) end;

  if v_delta <> 0 then
    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Opening stock - ' || NEW.name, 'products', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    if v_delta > 0 then
      insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
        (v_entry_id, public.coa_id('1200'), v_delta, 0),
        (v_entry_id, public.coa_id('3000'), 0, v_delta);
    else
      insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
        (v_entry_id, public.coa_id('3000'), -v_delta, 0),
        (v_entry_id, public.coa_id('1200'), 0, -v_delta);
    end if;
  end if;
  return NEW;
end;
$$;

create trigger products_opening_value_journal
after insert or update of opening_value on public.products
for each row execute function public.post_product_opening_value_journal();
