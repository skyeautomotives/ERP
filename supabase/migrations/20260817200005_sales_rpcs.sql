-- Phase 3: the RPCs that actually create/cancel a sale. Single-transaction by
-- being a single plpgsql function - if anything raises, Postgres rolls back the
-- whole thing automatically (invoice number allocation, line items, and stock
-- movements all succeed or all fail together, per section 53).

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

  -- Atomic allocation: the UPDATE takes a row lock on company_settings, so a
  -- concurrent call blocks until this transaction commits/rolls back - two
  -- invoices can never be handed the same number (section 3).
  update public.company_settings
  set next_invoice_number = next_invoice_number + 1
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
    v_line_cost := round(v_qty * coalesce(v_product.landing_cost, v_product.purchase_rate, 0), 2);
    v_line_profit := v_taxable - v_line_cost;

    insert into public.sales_invoice_items (
      invoice_id, product_id, quantity, rate, discount_percent, taxable_value,
      gst_percent, cgst, sgst, igst, line_total, cost_price, profit_amount
    ) values (
      v_invoice_id, v_product.id, v_qty, v_rate, v_discount_pct, v_taxable,
      v_product.gst_percent, v_cgst, v_sgst, v_igst, v_line_total, v_line_cost, v_line_profit
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

revoke all on function public.create_sales_invoice(text, uuid, text, text, uuid, uuid, int, text, jsonb) from public;
grant execute on function public.create_sales_invoice(text, uuid, text, text, uuid, uuid, int, text, jsonb) to authenticated;

create or replace function public.cancel_sales_invoice(p_invoice_id uuid)
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

  select status into v_status from public.sales_invoices where id = p_invoice_id;
  if v_status is null then
    raise exception 'Invoice not found';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Invoice is already cancelled';
  end if;

  for v_item in
    select product_id, quantity from public.sales_invoice_items where invoice_id = p_invoice_id
  loop
    insert into public.stock_transactions (
      product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
    ) values (
      v_item.product_id, v_item.quantity, 'sale_cancel', 'sales_invoices', p_invoice_id, auth.uid()
    );
  end loop;

  update public.sales_invoices
  set status = 'cancelled', updated_by = auth.uid()
  where id = p_invoice_id;
end;
$$;

revoke all on function public.cancel_sales_invoice(uuid) from public;
grant execute on function public.cancel_sales_invoice(uuid) to authenticated;

create or replace function public.get_last_price(p_customer_id uuid, p_product_id uuid)
returns table (
  rate numeric,
  discount_percent numeric,
  quantity numeric,
  invoice_date date,
  invoice_number text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (public.is_admin() or public.has_permission('sales', 'view')) then
    raise exception 'Not authorized';
  end if;

  return query
    select sii.rate, sii.discount_percent, sii.quantity, si.invoice_date, si.invoice_number
    from public.sales_invoice_items sii
    join public.sales_invoices si on si.id = sii.invoice_id
    where si.customer_id = p_customer_id
      and sii.product_id = p_product_id
      and si.status = 'active'
    order by si.invoice_date desc, si.created_at desc
    limit 1;
end;
$$;

revoke all on function public.get_last_price(uuid, uuid) from public;
grant execute on function public.get_last_price(uuid, uuid) to authenticated;
