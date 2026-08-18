-- Phase 13: create_receipt/create_payment gain an optional trailing
-- p_client_id, so the offline queue's client-generated UUID can be used as
-- the row's real id end to end. If a row with that id already exists, the
-- RPC returns it immediately instead of re-inserting - a network-flaky
-- retry after a server-side success can never create a duplicate (spec
-- section 46's "prevent duplicate records"). Dropping and recreating with
-- an added parameter, since CREATE OR REPLACE with a new parameter creates
-- a second overload rather than replacing in place.

drop function if exists public.create_receipt(text, uuid, text, numeric, date, text, text, jsonb);

create or replace function public.create_receipt(
  p_method text,
  p_customer_id uuid,
  p_mode text,
  p_amount numeric,
  p_receipt_date date,
  p_reference_number text,
  p_notes text,
  p_allocations jsonb,
  p_client_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_id uuid;
  v_receipt_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_item jsonb;
  v_invoice public.sales_invoice_outstanding;
  v_alloc_amount numeric;
  v_alloc_total numeric := 0;
begin
  if not (public.is_admin() or public.has_permission('accounts', 'create')) then
    raise exception 'Not authorized';
  end if;

  if p_client_id is not null then
    select id into v_receipt_id from public.receipts where id = p_client_id;
    if v_receipt_id is not null then
      return v_receipt_id;
    end if;
  end if;

  if p_method not in ('cash', 'bank') then
    raise exception 'Invalid method';
  end if;
  if p_customer_id is null then
    raise exception 'Customer is required';
  end if;
  if p_mode not in ('bill', 'on_account') then
    raise exception 'Invalid mode';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if p_mode = 'bill' then
    if p_allocations is null or jsonb_array_length(p_allocations) = 0 then
      raise exception 'Bill-mode receipts require at least one invoice allocation';
    end if;

    for v_item in select * from jsonb_array_elements(p_allocations)
    loop
      select * into v_invoice
      from public.sales_invoice_outstanding
      where invoice_id = (v_item->>'sales_invoice_id')::uuid;

      if v_invoice.invoice_id is null then
        raise exception 'Invoice not found';
      end if;
      if v_invoice.customer_id <> p_customer_id then
        raise exception 'Invoice does not belong to this customer';
      end if;
      if v_invoice.status <> 'active' then
        raise exception 'Invoice % is cancelled', v_invoice.invoice_number;
      end if;

      v_alloc_amount := (v_item->>'amount_allocated')::numeric;
      if v_alloc_amount is null or v_alloc_amount <= 0 then
        raise exception 'Allocation amount must be positive';
      end if;
      if v_alloc_amount > v_invoice.outstanding_amount + 0.01 then
        raise exception 'Allocation of % exceeds outstanding balance of % on invoice %',
          v_alloc_amount, v_invoice.outstanding_amount, v_invoice.invoice_number;
      end if;

      v_alloc_total := v_alloc_total + v_alloc_amount;
    end loop;

    if abs(v_alloc_total - p_amount) > 0.01 then
      raise exception 'Allocations (%) must add up to the receipt amount (%)', v_alloc_total, p_amount;
    end if;
  end if;

  update public.company_settings
  set next_receipt_number = next_receipt_number + 1
  where id = (select id from public.company_settings limit 1)
  returning receipt_prefix, (next_receipt_number - 1), receipt_padding
  into v_prefix, v_seq, v_padding;

  v_receipt_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  insert into public.receipts (
    id, receipt_number, method, customer_id, mode, amount, receipt_date, reference_number, notes, created_by
  ) values (
    coalesce(p_client_id, gen_random_uuid()), v_receipt_number, p_method, p_customer_id, p_mode, p_amount,
    coalesce(p_receipt_date, current_date), p_reference_number, p_notes, auth.uid()
  )
  returning id into v_receipt_id;

  if p_mode = 'bill' then
    for v_item in select * from jsonb_array_elements(p_allocations)
    loop
      insert into public.receipt_allocations (receipt_id, sales_invoice_id, amount_allocated)
      values (v_receipt_id, (v_item->>'sales_invoice_id')::uuid, (v_item->>'amount_allocated')::numeric);
    end loop;
  end if;

  return v_receipt_id;
end;
$$;

revoke all on function public.create_receipt(text, uuid, text, numeric, date, text, text, jsonb, uuid) from public;
grant execute on function public.create_receipt(text, uuid, text, numeric, date, text, text, jsonb, uuid) to authenticated;

drop function if exists public.create_payment(text, text, uuid, uuid, text, numeric, date, text, text, jsonb);

create or replace function public.create_payment(
  p_method text,
  p_purpose text,
  p_supplier_id uuid,
  p_expense_category_id uuid,
  p_paid_to text,
  p_amount numeric,
  p_payment_date date,
  p_reference_number text,
  p_notes text,
  p_allocations jsonb,
  p_client_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_payment_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_item jsonb;
  v_invoice public.purchase_invoice_outstanding;
  v_alloc_amount numeric;
  v_alloc_total numeric := 0;
begin
  if not (public.is_admin() or public.has_permission('accounts', 'create')) then
    raise exception 'Not authorized';
  end if;

  if p_client_id is not null then
    select id into v_payment_id from public.payments where id = p_client_id;
    if v_payment_id is not null then
      return v_payment_id;
    end if;
  end if;

  if p_method not in ('cash', 'bank') then
    raise exception 'Invalid method';
  end if;
  if p_purpose not in ('supplier', 'on_account', 'expense') then
    raise exception 'Invalid purpose';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if p_purpose in ('supplier', 'on_account') and p_supplier_id is null then
    raise exception 'Supplier is required for this payment purpose';
  end if;
  if p_purpose = 'expense' and p_expense_category_id is null then
    raise exception 'Expense category is required';
  end if;

  if p_purpose = 'supplier' then
    if p_allocations is null or jsonb_array_length(p_allocations) = 0 then
      raise exception 'Supplier bill payments require at least one invoice allocation';
    end if;

    for v_item in select * from jsonb_array_elements(p_allocations)
    loop
      select * into v_invoice
      from public.purchase_invoice_outstanding
      where invoice_id = (v_item->>'purchase_invoice_id')::uuid;

      if v_invoice.invoice_id is null then
        raise exception 'Invoice not found';
      end if;
      if v_invoice.supplier_id <> p_supplier_id then
        raise exception 'Invoice does not belong to this supplier';
      end if;
      if v_invoice.status <> 'active' then
        raise exception 'Invoice % is cancelled', v_invoice.our_reference_number;
      end if;

      v_alloc_amount := (v_item->>'amount_allocated')::numeric;
      if v_alloc_amount is null or v_alloc_amount <= 0 then
        raise exception 'Allocation amount must be positive';
      end if;
      if v_alloc_amount > v_invoice.outstanding_amount + 0.01 then
        raise exception 'Allocation of % exceeds outstanding balance of % on invoice %',
          v_alloc_amount, v_invoice.outstanding_amount, v_invoice.our_reference_number;
      end if;

      v_alloc_total := v_alloc_total + v_alloc_amount;
    end loop;

    if abs(v_alloc_total - p_amount) > 0.01 then
      raise exception 'Allocations (%) must add up to the payment amount (%)', v_alloc_total, p_amount;
    end if;
  end if;

  update public.company_settings
  set next_payment_number = next_payment_number + 1
  where id = (select id from public.company_settings limit 1)
  returning payment_prefix, (next_payment_number - 1), payment_padding
  into v_prefix, v_seq, v_padding;

  v_payment_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  insert into public.payments (
    id, payment_number, method, purpose, supplier_id, expense_category_id, paid_to,
    amount, payment_date, reference_number, notes, created_by
  ) values (
    coalesce(p_client_id, gen_random_uuid()), v_payment_number, p_method, p_purpose, p_supplier_id, p_expense_category_id, p_paid_to,
    p_amount, coalesce(p_payment_date, current_date), p_reference_number, p_notes, auth.uid()
  )
  returning id into v_payment_id;

  if p_purpose = 'supplier' then
    for v_item in select * from jsonb_array_elements(p_allocations)
    loop
      insert into public.payment_allocations (payment_id, purchase_invoice_id, amount_allocated)
      values (v_payment_id, (v_item->>'purchase_invoice_id')::uuid, (v_item->>'amount_allocated')::numeric);
    end loop;
  end if;

  return v_payment_id;
end;
$$;

revoke all on function public.create_payment(text, text, uuid, uuid, text, numeric, date, text, text, jsonb, uuid) from public;
grant execute on function public.create_payment(text, text, uuid, uuid, text, numeric, date, text, text, jsonb, uuid) to authenticated;
