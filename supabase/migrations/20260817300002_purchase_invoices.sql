-- Phase 4: purchase_invoices / purchase_invoice_items (sections 15-16).
-- Same lockdown as sales_invoices - no direct insert/update policy for
-- 'authenticated', every write goes through the create_/cancel_purchase_invoice
-- RPCs so numbering, GST, stock, and the duplicate-supplier-invoice check can
-- never be bypassed or half-applied.

create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  our_reference_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  supplier_invoice_number text not null,
  supplier_invoice_date date not null,
  notes text,
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  taxable_total numeric(14, 2) not null default 0,
  cgst_total numeric(14, 2) not null default 0,
  sgst_total numeric(14, 2) not null default 0,
  igst_total numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  duplicate_override boolean not null default false,
  overridden_by uuid references auth.users(id),
  overridden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index purchase_invoices_supplier_idx on public.purchase_invoices (supplier_id);
create index purchase_invoices_supplier_invoice_idx on public.purchase_invoices (supplier_id, supplier_invoice_number);
create index purchase_invoices_date_idx on public.purchase_invoices (supplier_invoice_date);

alter table public.purchase_invoices enable row level security;

create trigger purchase_invoices_set_updated_at
before update on public.purchase_invoices
for each row execute function public.set_updated_at();

create trigger audit_purchase_invoices
after insert or update on public.purchase_invoices
for each row execute function public.log_audit();

create policy "purchase_invoices_select_permitted" on public.purchase_invoices
  for select to authenticated
  using (public.is_admin() or public.has_permission('purchase', 'view'));

create table public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14, 3) not null,
  rate numeric(14, 2) not null,
  discount_percent numeric(5, 2) not null default 0,
  taxable_value numeric(14, 2) not null,
  gst_percent numeric(5, 2) not null default 0,
  cgst numeric(14, 2) not null default 0,
  sgst numeric(14, 2) not null default 0,
  igst numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null
);

create index purchase_invoice_items_invoice_idx on public.purchase_invoice_items (invoice_id);
create index purchase_invoice_items_product_idx on public.purchase_invoice_items (product_id);

alter table public.purchase_invoice_items enable row level security;

create policy "purchase_invoice_items_select_permitted" on public.purchase_invoice_items
  for select to authenticated
  using (public.is_admin() or public.has_permission('purchase', 'view'));
