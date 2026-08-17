-- Phase 6: create_receipt / cancel_receipt. Same atomic-numbering + single-function-
-- transaction pattern as create_sales_invoice.

create or replace function public.create_receipt(
  p_method text,
  p_customer_id uuid,
  p_mode text,
  p_amount numeric,
  p_receipt_date date,
  p_reference_number text,
  p_notes text,
  p_allocations jsonb
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
    receipt_number, method, customer_id, mode, amount, receipt_date, reference_number, notes, created_by
  ) values (
    v_receipt_number, p_method, p_customer_id, p_mode, p_amount, coalesce(p_receipt_date, current_date),
    p_reference_number, p_notes, auth.uid()
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

revoke all on function public.create_receipt(text, uuid, text, numeric, date, text, text, jsonb) from public;
grant execute on function public.create_receipt(text, uuid, text, numeric, date, text, text, jsonb) to authenticated;

create or replace function public.cancel_receipt(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not (public.is_admin() or public.has_permission('accounts', 'delete')) then
    raise exception 'Not authorized';
  end if;

  select status into v_status from public.receipts where id = p_receipt_id;
  if v_status is null then
    raise exception 'Receipt not found';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Receipt is already cancelled';
  end if;

  update public.receipts
  set status = 'cancelled', updated_by = auth.uid()
  where id = p_receipt_id;
end;
$$;

revoke all on function public.cancel_receipt(uuid) from public;
grant execute on function public.cancel_receipt(uuid) to authenticated;
