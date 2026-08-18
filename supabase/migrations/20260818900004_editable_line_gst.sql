-- Line-level GST% was always taken from the product master, with no way to
-- correct it on a specific invoice line (e.g. a product's master GST% was
-- entered wrong, or a specific sale genuinely needs a different rate). Both
-- RPCs now accept an optional "gst_percent" on each item; when present and
-- valid it overrides the product's rate for that line only, otherwise the
-- product's rate is used exactly as before. Credit/debit note RPCs already
-- copy gst_percent from the original invoice line, so they stay correct
-- automatically - no change needed there.

create or replace function public.create_sales_invoice(
  p_sale_type text,
  p_customer_id uuid,
  p_cash_customer_name text,
  p_cash_customer_phone text,
  p_route_id uuid,
  p_staff_id uuid,
  p_credit_period_days int,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_company_state text;
  v_customer_state text;
  v_is_interstate boolean;
  v_item jsonb;
  v_product public.products;
  v_qty numeric;
  v_rate numeric;
  v_discount_pct numeric;
  v_gst_percent numeric;
  v_taxable numeric;
  v_gst_amount numeric;
  v_cgst numeric;
  v_sgst numeric;
  v_igst numeric;
  v_line_total numeric;
  v_line_cost numeric;
  v_line_profit numeric;
  v_subtotal numeric := 0;
  v_discount_total numeric := 0;
  v_taxable_total numeric := 0;
  v_cgst_total numeric := 0;
  v_sgst_total numeric := 0;
  v_igst_total numeric := 0;
  v_total numeric := 0;
  v_cost_total numeric := 0;
  v_profit_total numeric := 0;
begin
  if not (public.is_admin() or public.has_permission('sales', 'create')) then
    raise exception 'Not authorized';
  end if;

  if p_sale_type not in ('credit', 'cash') then
    raise exception 'Invalid sale type';
  end if;
  if p_staff_id is null then
    raise exception 'Staff must be assigned to the sale';
  end if;
  if p_sale_type = 'credit' and p_customer_id is null then
    raise exception 'Credit sales require a customer';
  end if;
  if p_sale_type = 'cash' and p_customer_id is null and coalesce(p_cash_customer_name, '') = '' then
    raise exception 'Cash sales require a customer or a walk-in name';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  update public.company_settings
  set next_invoice_number = next_invoice_number + 1
  where id = (select id from public.company_settings limit 1)
  returning invoice_prefix, (next_invoice_number - 1), invoice_number_padding, state
  into v_prefix, v_seq, v_padding, v_company_state;

  v_invoice_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  if p_customer_id is not null then
    select state into v_customer_state from public.customers where id = p_customer_id;
  end if;
  v_is_interstate := v_customer_state is not null and v_company_state is not null
    and lower(trim(v_customer_state)) <> lower(trim(v_company_state));

  insert into public.sales_invoices (
    invoice_number, sale_type, customer_id, cash_customer_name, cash_customer_phone,
    route_id, staff_id, credit_period_days, due_date, notes, created_by
  ) values (
    v_invoice_number, p_sale_type, p_customer_id, p_cash_customer_name, p_cash_customer_phone,
    p_route_id, p_staff_id, coalesce(p_credit_period_days, 0),
    case when p_sale_type = 'credit' then current_date + coalesce(p_credit_period_days, 0) else null end,
    p_notes, auth.uid()
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
    v_gst_percent := coalesce((v_item->>'gst_percent')::numeric, v_product.gst_percent);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive';
    end if;
    if v_rate is null or v_rate < 0 then
      raise exception 'Rate must not be negative';
    end if;
    if v_gst_percent < 0 or v_gst_percent > 100 then
      raise exception 'GST %% must be between 0 and 100';
    end if;

    v_taxable := round(v_qty * v_rate * (1 - v_discount_pct / 100), 2);
    v_gst_amount := round(v_taxable * v_gst_percent / 100, 2);

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
    v_line_cost := round(v_qty * coalesce(v_product.landing_cost, v_product.purchase_rate, 0), 2);
    v_line_profit := v_taxable - v_line_cost;

    insert into public.sales_invoice_items (
      invoice_id, product_id, quantity, rate, discount_percent, taxable_value,
      gst_percent, cgst, sgst, igst, line_total, cost_price, profit_amount
    ) values (
      v_invoice_id, v_product.id, v_qty, v_rate, v_discount_pct, v_taxable,
      v_gst_percent, v_cgst, v_sgst, v_igst, v_line_total, v_line_cost, v_line_profit
    );

    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_product.id, -1 * v_qty, 'sale', 'sales_invoices', v_invoice_id, auth.uid()
    );

    v_subtotal := v_subtotal + (v_qty * v_rate);
    v_discount_total := v_discount_total + ((v_qty * v_rate) - v_taxable);
    v_taxable_total := v_taxable_total + v_taxable;
    v_cgst_total := v_cgst_total + v_cgst;
    v_sgst_total := v_sgst_total + v_sgst;
    v_igst_total := v_igst_total + v_igst;
    v_total := v_total + v_line_total;
    v_cost_total := v_cost_total + v_line_cost;
    v_profit_total := v_profit_total + v_line_profit;
  end loop;

  update public.sales_invoices set
    subtotal = v_subtotal,
    discount_total = v_discount_total,
    taxable_total = v_taxable_total,
    cgst_total = v_cgst_total,
    sgst_total = v_sgst_total,
    igst_total = v_igst_total,
    total_amount = v_total,
    cost_total = v_cost_total,
    profit_total = v_profit_total
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

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
  v_gst_percent numeric;
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
    v_gst_percent := coalesce((v_item->>'gst_percent')::numeric, v_product.gst_percent);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive';
    end if;
    if v_rate is null or v_rate < 0 then
      raise exception 'Rate must not be negative';
    end if;
    if v_gst_percent < 0 or v_gst_percent > 100 then
      raise exception 'GST %% must be between 0 and 100';
    end if;

    v_taxable := round(v_qty * v_rate * (1 - v_discount_pct / 100), 2);
    v_gst_amount := round(v_taxable * v_gst_percent / 100, 2);

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
      v_gst_percent, v_cgst, v_sgst, v_igst, v_line_total
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
