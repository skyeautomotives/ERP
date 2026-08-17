-- Phase 8: create_/cancel_ for credit notes and debit notes. Same atomic
-- single-function-transaction pattern as create_sales_invoice/create_purchase_invoice -
-- insert the header first (line items need its id), accumulate totals across
-- the loop, then one final UPDATE fills them in. Each returned quantity is
-- validated against what's actually left to return on that invoice line.

create or replace function public.create_credit_note(
  p_sales_invoice_id uuid,
  p_reason text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id uuid;
  v_note_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_customer_id uuid;
  v_item jsonb;
  v_inv_item public.sales_invoice_items;
  v_qty numeric;
  v_already_returned numeric;
  v_remaining numeric;
  v_taxable numeric;
  v_cgst numeric;
  v_sgst numeric;
  v_igst numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount_total numeric := 0;
  v_taxable_total numeric := 0;
  v_cgst_total numeric := 0;
  v_sgst_total numeric := 0;
  v_igst_total numeric := 0;
  v_total numeric := 0;
begin
  if not (public.is_admin() or public.has_permission('sales', 'create')) then
    raise exception 'Not authorized';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;

  select customer_id into v_customer_id from public.sales_invoices
  where id = p_sales_invoice_id and status = 'active';
  if v_customer_id is null then
    raise exception 'Sales invoice not found or cancelled';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required';
  end if;

  update public.company_settings
  set next_credit_note_number = next_credit_note_number + 1
  where id = (select id from public.company_settings limit 1)
  returning credit_note_prefix, (next_credit_note_number - 1), credit_note_padding
  into v_prefix, v_seq, v_padding;

  v_note_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  insert into public.credit_notes (credit_note_number, sales_invoice_id, customer_id, reason, created_by)
  values (v_note_number, p_sales_invoice_id, v_customer_id, p_reason, auth.uid())
  returning id into v_note_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_inv_item from public.sales_invoice_items
    where id = (v_item->>'sales_invoice_item_id')::uuid and invoice_id = p_sales_invoice_id;

    if v_inv_item.id is null then
      raise exception 'Line item not found on this invoice';
    end if;

    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Return quantity must be positive';
    end if;

    select coalesce(sum(cni.quantity), 0) into v_already_returned
    from public.credit_note_items cni
    join public.credit_notes cn on cn.id = cni.credit_note_id
    where cni.sales_invoice_item_id = v_inv_item.id and cn.status = 'active';

    v_remaining := v_inv_item.quantity - v_already_returned;
    if v_qty > v_remaining then
      raise exception 'Cannot return % - only % remaining on this line', v_qty, v_remaining;
    end if;

    v_taxable := round(v_inv_item.taxable_value * v_qty / v_inv_item.quantity, 2);
    v_cgst := round(v_inv_item.cgst * v_qty / v_inv_item.quantity, 2);
    v_sgst := round(v_inv_item.sgst * v_qty / v_inv_item.quantity, 2);
    v_igst := round(v_inv_item.igst * v_qty / v_inv_item.quantity, 2);
    v_line_total := v_taxable + v_cgst + v_sgst + v_igst;

    insert into public.credit_note_items (
      credit_note_id, sales_invoice_item_id, product_id, quantity, rate, discount_percent,
      taxable_value, gst_percent, cgst, sgst, igst, line_total
    ) values (
      v_note_id, v_inv_item.id, v_inv_item.product_id, v_qty, v_inv_item.rate, v_inv_item.discount_percent,
      v_taxable, v_inv_item.gst_percent, v_cgst, v_sgst, v_igst, v_line_total
    );

    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_inv_item.product_id, v_qty, 'sales_return', 'credit_notes', v_note_id, auth.uid()
    );

    v_subtotal := v_subtotal + (v_inv_item.rate * v_qty);
    v_discount_total := v_discount_total + ((v_inv_item.rate * v_qty) - v_taxable);
    v_taxable_total := v_taxable_total + v_taxable;
    v_cgst_total := v_cgst_total + v_cgst;
    v_sgst_total := v_sgst_total + v_sgst;
    v_igst_total := v_igst_total + v_igst;
    v_total := v_total + v_line_total;
  end loop;

  update public.credit_notes set
    subtotal = v_subtotal,
    discount_total = v_discount_total,
    taxable_total = v_taxable_total,
    cgst_total = v_cgst_total,
    sgst_total = v_sgst_total,
    igst_total = v_igst_total,
    total_amount = v_total
  where id = v_note_id;

  return v_note_id;
end;
$$;

revoke all on function public.create_credit_note(uuid, text, jsonb) from public;
grant execute on function public.create_credit_note(uuid, text, jsonb) to authenticated;

create or replace function public.cancel_credit_note(p_credit_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_item record;
begin
  if not (public.is_admin() or public.has_permission('sales', 'delete')) then
    raise exception 'Not authorized';
  end if;

  select status into v_status from public.credit_notes where id = p_credit_note_id;
  if v_status is null then
    raise exception 'Credit note not found';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Credit note is already cancelled';
  end if;

  for v_item in
    select product_id, quantity from public.credit_note_items where credit_note_id = p_credit_note_id
  loop
    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_item.product_id, -1 * v_item.quantity, 'sales_return_cancel', 'credit_notes', p_credit_note_id, auth.uid()
    );
  end loop;

  update public.credit_notes
  set status = 'cancelled', updated_by = auth.uid()
  where id = p_credit_note_id;
end;
$$;

revoke all on function public.cancel_credit_note(uuid) from public;
grant execute on function public.cancel_credit_note(uuid) to authenticated;

-- ===== Debit notes (mirrored for purchases) =====

create or replace function public.create_debit_note(
  p_purchase_invoice_id uuid,
  p_reason text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id uuid;
  v_note_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_supplier_id uuid;
  v_item jsonb;
  v_inv_item public.purchase_invoice_items;
  v_qty numeric;
  v_already_returned numeric;
  v_remaining numeric;
  v_taxable numeric;
  v_cgst numeric;
  v_sgst numeric;
  v_igst numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount_total numeric := 0;
  v_taxable_total numeric := 0;
  v_cgst_total numeric := 0;
  v_sgst_total numeric := 0;
  v_igst_total numeric := 0;
  v_total numeric := 0;
begin
  if not (public.is_admin() or public.has_permission('purchase', 'create')) then
    raise exception 'Not authorized';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;

  select supplier_id into v_supplier_id from public.purchase_invoices
  where id = p_purchase_invoice_id and status = 'active';
  if v_supplier_id is null then
    raise exception 'Purchase invoice not found or cancelled';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required';
  end if;

  update public.company_settings
  set next_debit_note_number = next_debit_note_number + 1
  where id = (select id from public.company_settings limit 1)
  returning debit_note_prefix, (next_debit_note_number - 1), debit_note_padding
  into v_prefix, v_seq, v_padding;

  v_note_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  insert into public.debit_notes (debit_note_number, purchase_invoice_id, supplier_id, reason, created_by)
  values (v_note_number, p_purchase_invoice_id, v_supplier_id, p_reason, auth.uid())
  returning id into v_note_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_inv_item from public.purchase_invoice_items
    where id = (v_item->>'purchase_invoice_item_id')::uuid and invoice_id = p_purchase_invoice_id;

    if v_inv_item.id is null then
      raise exception 'Line item not found on this invoice';
    end if;

    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Return quantity must be positive';
    end if;

    select coalesce(sum(dni.quantity), 0) into v_already_returned
    from public.debit_note_items dni
    join public.debit_notes dn on dn.id = dni.debit_note_id
    where dni.purchase_invoice_item_id = v_inv_item.id and dn.status = 'active';

    v_remaining := v_inv_item.quantity - v_already_returned;
    if v_qty > v_remaining then
      raise exception 'Cannot return % - only % remaining on this line', v_qty, v_remaining;
    end if;

    v_taxable := round(v_inv_item.taxable_value * v_qty / v_inv_item.quantity, 2);
    v_cgst := round(v_inv_item.cgst * v_qty / v_inv_item.quantity, 2);
    v_sgst := round(v_inv_item.sgst * v_qty / v_inv_item.quantity, 2);
    v_igst := round(v_inv_item.igst * v_qty / v_inv_item.quantity, 2);
    v_line_total := v_taxable + v_cgst + v_sgst + v_igst;

    insert into public.debit_note_items (
      debit_note_id, purchase_invoice_item_id, product_id, quantity, rate, discount_percent,
      taxable_value, gst_percent, cgst, sgst, igst, line_total
    ) values (
      v_note_id, v_inv_item.id, v_inv_item.product_id, v_qty, v_inv_item.rate, v_inv_item.discount_percent,
      v_taxable, v_inv_item.gst_percent, v_cgst, v_sgst, v_igst, v_line_total
    );

    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_inv_item.product_id, -1 * v_qty, 'purchase_return', 'debit_notes', v_note_id, auth.uid()
    );

    v_subtotal := v_subtotal + (v_inv_item.rate * v_qty);
    v_discount_total := v_discount_total + ((v_inv_item.rate * v_qty) - v_taxable);
    v_taxable_total := v_taxable_total + v_taxable;
    v_cgst_total := v_cgst_total + v_cgst;
    v_sgst_total := v_sgst_total + v_sgst;
    v_igst_total := v_igst_total + v_igst;
    v_total := v_total + v_line_total;
  end loop;

  update public.debit_notes set
    subtotal = v_subtotal,
    discount_total = v_discount_total,
    taxable_total = v_taxable_total,
    cgst_total = v_cgst_total,
    sgst_total = v_sgst_total,
    igst_total = v_igst_total,
    total_amount = v_total
  where id = v_note_id;

  return v_note_id;
end;
$$;

revoke all on function public.create_debit_note(uuid, text, jsonb) from public;
grant execute on function public.create_debit_note(uuid, text, jsonb) to authenticated;

create or replace function public.cancel_debit_note(p_debit_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_item record;
begin
  if not (public.is_admin() or public.has_permission('purchase', 'delete')) then
    raise exception 'Not authorized';
  end if;

  select status into v_status from public.debit_notes where id = p_debit_note_id;
  if v_status is null then
    raise exception 'Debit note not found';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Debit note is already cancelled';
  end if;

  for v_item in
    select product_id, quantity from public.debit_note_items where debit_note_id = p_debit_note_id
  loop
    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_item.product_id, v_item.quantity, 'purchase_return_cancel', 'debit_notes', p_debit_note_id, auth.uid()
    );
  end loop;

  update public.debit_notes
  set status = 'cancelled', updated_by = auth.uid()
  where id = p_debit_note_id;
end;
$$;

revoke all on function public.cancel_debit_note(uuid) from public;
grant execute on function public.cancel_debit_note(uuid) to authenticated;
