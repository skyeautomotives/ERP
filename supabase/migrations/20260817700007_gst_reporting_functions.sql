-- Phase 8: GSTR-1 (B2B + B2C summary), HSN summary, and Purchase Register.
-- Same SQL-function-returning-a-table pattern as Phase 5/7's reporting RPCs.

create or replace function public.get_gstr1_b2b(p_from date, p_to date)
returns table (
  invoice_id uuid,
  invoice_number text,
  invoice_date date,
  customer_name text,
  customer_gstin text,
  taxable_total numeric,
  cgst_total numeric,
  sgst_total numeric,
  igst_total numeric,
  total_amount numeric
)
language sql
security invoker
set search_path = public
as $$
  select si.id, si.invoice_number, si.invoice_date, c.name, c.gstin,
    si.taxable_total, si.cgst_total, si.sgst_total, si.igst_total, si.total_amount
  from public.sales_invoices si
  join public.customers c on c.id = si.customer_id
  where si.status = 'active'
    and si.invoice_date between p_from and p_to
    and c.gstin is not null and c.gstin <> ''
  order by si.invoice_date, si.invoice_number;
$$;

create or replace function public.get_gstr1_b2c_summary(p_from date, p_to date)
returns table (
  gst_percent numeric,
  invoice_count bigint,
  taxable_total numeric,
  cgst_total numeric,
  sgst_total numeric,
  igst_total numeric,
  total_amount numeric
)
language sql
security invoker
set search_path = public
as $$
  select sii.gst_percent,
    count(distinct si.id) as invoice_count,
    sum(sii.taxable_value) as taxable_total,
    sum(sii.cgst) as cgst_total,
    sum(sii.sgst) as sgst_total,
    sum(sii.igst) as igst_total,
    sum(sii.line_total) as total_amount
  from public.sales_invoice_items sii
  join public.sales_invoices si on si.id = sii.invoice_id
  left join public.customers c on c.id = si.customer_id
  where si.status = 'active'
    and si.invoice_date between p_from and p_to
    and (c.id is null or c.gstin is null or c.gstin = '')
  group by sii.gst_percent
  order by sii.gst_percent;
$$;

create or replace function public.get_hsn_summary(p_from date, p_to date, p_type text)
returns table (
  hsn_code text,
  description text,
  unit text,
  gst_percent numeric,
  total_quantity numeric,
  taxable_total numeric,
  cgst_total numeric,
  sgst_total numeric,
  igst_total numeric,
  total_amount numeric
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_type = 'sales' then
    return query
    select coalesce(pr.hsn_code, 'N/A'), string_agg(distinct pr.name, ', '), min(pr.unit), sii.gst_percent,
      sum(sii.quantity), sum(sii.taxable_value), sum(sii.cgst), sum(sii.sgst), sum(sii.igst), sum(sii.line_total)
    from public.sales_invoice_items sii
    join public.sales_invoices si on si.id = sii.invoice_id
    join public.products pr on pr.id = sii.product_id
    where si.status = 'active' and si.invoice_date between p_from and p_to
    group by coalesce(pr.hsn_code, 'N/A'), sii.gst_percent
    order by 1, 4;
  elsif p_type = 'purchase' then
    return query
    select coalesce(pr.hsn_code, 'N/A'), string_agg(distinct pr.name, ', '), min(pr.unit), pii.gst_percent,
      sum(pii.quantity), sum(pii.taxable_value), sum(pii.cgst), sum(pii.sgst), sum(pii.igst), sum(pii.line_total)
    from public.purchase_invoice_items pii
    join public.purchase_invoices pi on pi.id = pii.invoice_id
    join public.products pr on pr.id = pii.product_id
    where pi.status = 'active' and pi.supplier_invoice_date between p_from and p_to
    group by coalesce(pr.hsn_code, 'N/A'), pii.gst_percent
    order by 1, 4;
  else
    raise exception 'Invalid type - must be sales or purchase';
  end if;
end;
$$;

create or replace function public.get_purchase_register(p_from date, p_to date)
returns table (
  invoice_id uuid,
  our_reference_number text,
  supplier_invoice_number text,
  invoice_date date,
  supplier_name text,
  supplier_gstin text,
  taxable_total numeric,
  cgst_total numeric,
  sgst_total numeric,
  igst_total numeric,
  total_amount numeric
)
language sql
security invoker
set search_path = public
as $$
  select pi.id, pi.our_reference_number, pi.supplier_invoice_number, pi.supplier_invoice_date,
    s.name, s.gstin, pi.taxable_total, pi.cgst_total, pi.sgst_total, pi.igst_total, pi.total_amount
  from public.purchase_invoices pi
  join public.suppliers s on s.id = pi.supplier_id
  where pi.status = 'active' and pi.supplier_invoice_date between p_from and p_to
  order by pi.supplier_invoice_date, pi.our_reference_number;
$$;
