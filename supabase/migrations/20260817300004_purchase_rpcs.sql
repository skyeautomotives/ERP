-- Phase 4: the RPCs that create/cancel a purchase and record bill verification.
-- Same atomic-transaction-via-single-function pattern as Phase 3's sales RPCs.

create or replace function public.create_purchase_invoice(
  p_supplier_id uuid,
  p_supplier_invoice_number text,
  p_supplier_invoice_date date,
  p_notes text,
  p_items jsonb,
  p_override_duplicate boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_ref_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_company_state text;
  v_supplier_state text;
  v_is_interstate boolean;
  v_duplicate_id uuid;
  v_item jsonb;
  v_product public.products;
  v_qty numeric;
  v_rate numeric;
  v_discount_pct numeric;
  v_taxable numeric;
  v_gst_amount numeric;
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

  if p_supplier_id is null then
    raise exception 'Supplier is required';
  end if;
  if coalesce(trim(p_supplier_invoice_number), '') = '' then
    raise exception 'Supplier invoice number is required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  select id into v_duplicate_id
  from public.purchase_invoices
  where supplier_id = p_supplier_id
    and lower(trim(supplier_invoice_number)) = lower(trim(p_supplier_invoice_number))
    and status = 'active'
  limit 1;

  if v_duplicate_id is not null and not coalesce(p_override_duplicate, false) then
    raise exception 'DUPLICATE_SUPPLIER_INVOICE';
  end if;

  if v_duplicate_id is not null and p_override_duplicate then
    if not (public.is_admin() or public.has_permission('purchase', 'delete')) then
      raise exception 'You do not have permission to override the duplicate invoice check';
    end if;
  end if;

  update public.company_settings
  set next_purchase_ref_number = next_purchase_ref_number + 1
  where id = (select id from public.company_settings limit 1)
  returning purchase_ref_prefix, (next_purchase_ref_number - 1), purchase_ref_padding, state
  into v_prefix, v_seq, v_padding, v_company_state;

  v_ref_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  select state into v_supplier_state from public.suppliers where id = p_supplier_id;
  v_is_interstate := v_supplier_state is not null and v_company_state is not null
    and lower(trim(v_supplier_state)) <> lower(trim(v_company_state));

  insert into public.purchase_invoices (
    our_reference_number, supplier_id, supplier_invoice_number, supplier_invoice_date,
    notes, duplicate_override, overridden_by, overridden_at, created_by
  ) values (
    v_ref_number, p_supplier_id, p_supplier_invoice_number, p_supplier_invoice_date,
    p_notes, coalesce(p_override_duplicate, false) and v_duplicate_id is not null,
    case when v_duplicate_id is not null and p_override_duplicate then auth.uid() else null end,
    case when v_duplicate_id is not null and p_override_duplicate then now() else null end,
    auth.uid()
  )
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_active = true;
    if v_product.id is null then
      raise exception 'Product not found or inactive';
    end if;

    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_discount_pct := coalesce((v_item->>'discount_percent')::numeric, 0);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive';
    end if;
    if v_rate is null or v_rate < 0 then
      raise exception 'Rate must not be negative';
    end if;

    v_taxable := round(v_qty * v_rate * (1 - v_discount_pct / 100), 2);
    v_gst_amount := round(v_taxable * v_product.gst_percent / 100, 2);

    if v_is_interstate then
      v_igst := v_gst_amount;
      v_cgst := 0;
      v_sgst := 0;
    else
      v_igst := 0;
      v_cgst := round(v_gst_amount / 2, 2);
      v_sgst := v_gst_amount - v_cgst;
    end if;

    v_line_total := v_taxable + v_gst_amount;

    insert into public.purchase_invoice_items (
      invoice_id, product_id, quantity, rate, discount_percent, taxable_value,
      gst_percent, cgst, sgst, igst, line_total
    ) values (
      v_invoice_id, v_product.id, v_qty, v_rate, v_discount_pct, v_taxable,
      v_product.gst_percent, v_cgst, v_sgst, v_igst, v_line_total
    );

    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_product.id, v_qty, 'purchase', 'purchase_invoices', v_invoice_id, auth.uid()
    );

    update public.products
    set last_purchase_rate = v_rate, last_purchase_date = p_supplier_invoice_date
    where id = v_product.id;

    v_subtotal := v_subtotal + (v_qty * v_rate);
    v_discount_total := v_discount_total + ((v_qty * v_rate) - v_taxable);
    v_taxable_total := v_taxable_total + v_taxable;
    v_cgst_total := v_cgst_total + v_cgst;
    v_sgst_total := v_sgst_total + v_sgst;
    v_igst_total := v_igst_total + v_igst;
    v_total := v_total + v_line_total;
  end loop;

  update public.purchase_invoices set
    subtotal = v_subtotal,
    discount_total = v_discount_total,
    taxable_total = v_taxable_total,
    cgst_total = v_cgst_total,
    sgst_total = v_sgst_total,
    igst_total = v_igst_total,
    total_amount = v_total
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke all on function public.create_purchase_invoice(uuid, text, date, text, jsonb, boolean) from public;
grant execute on function public.create_purchase_invoice(uuid, text, date, text, jsonb, boolean) to authenticated;

create or replace function public.cancel_purchase_invoice(p_invoice_id uuid)
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

  select status into v_status from public.purchase_invoices where id = p_invoice_id;
  if v_status is null then
    raise exception 'Invoice not found';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Invoice is already cancelled';
  end if;

  for v_item in
    select product_id, quantity from public.purchase_invoice_items where invoice_id = p_invoice_id
  loop
    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_item.product_id, -1 * v_item.quantity, 'purchase_cancel', 'purchase_invoices', p_invoice_id, auth.uid()
    );
  end loop;

  update public.purchase_invoices
  set status = 'cancelled', updated_by = auth.uid()
  where id = p_invoice_id;
end;
$$;

revoke all on function public.cancel_purchase_invoice(uuid) from public;
grant execute on function public.cancel_purchase_invoice(uuid) to authenticated;

create or replace function public.record_purchase_verification(
  p_invoice_id uuid,
  p_supplier_taxable_value numeric,
  p_supplier_gst_total numeric,
  p_supplier_total numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.purchase_invoices;
  v_status text;
  v_verification_id uuid;
  v_tolerance numeric := 0.01;
begin
  if not (public.is_admin() or public.has_permission('purchase', 'edit')) then
    raise exception 'Not authorized';
  end if;

  select * into v_invoice from public.purchase_invoices where id = p_invoice_id;
  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  if abs(coalesce(p_supplier_total, 0) - v_invoice.total_amount) <= v_tolerance then
    if abs(coalesce(p_supplier_taxable_value, 0) - v_invoice.taxable_total) <= v_tolerance
       and abs(coalesce(p_supplier_gst_total, 0) - (v_invoice.cgst_total + v_invoice.sgst_total + v_invoice.igst_total)) <= v_tolerance then
      v_status := 'matched';
    else
      v_status := 'partial';
    end if;
  else
    v_status := 'mismatch';
  end if;

  insert into public.purchase_verifications (
    purchase_invoice_id, supplier_taxable_value, supplier_gst_total, supplier_total,
    status, notes, verified_by, verified_at
  ) values (
    p_invoice_id, p_supplier_taxable_value, p_supplier_gst_total, p_supplier_total,
    v_status, p_notes, auth.uid(), now()
  )
  on conflict (purchase_invoice_id) do update set
    supplier_taxable_value = excluded.supplier_taxable_value,
    supplier_gst_total = excluded.supplier_gst_total,
    supplier_total = excluded.supplier_total,
    status = excluded.status,
    notes = excluded.notes,
    verified_by = excluded.verified_by,
    verified_at = excluded.verified_at
  returning id into v_verification_id;

  return v_verification_id;
end;
$$;

revoke all on function public.record_purchase_verification(uuid, numeric, numeric, numeric, text) from public;
grant execute on function public.record_purchase_verification(uuid, numeric, numeric, numeric, text) to authenticated;
