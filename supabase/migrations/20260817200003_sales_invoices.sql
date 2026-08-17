-- Phase 3: sales_invoices / sales_invoice_items (sections 10-13).
--
-- Deliberately NO insert/update/delete policy for 'authenticated' on either table:
-- every write must go through the create_sales_invoice / cancel_sales_invoice RPCs
-- (added in a later migration), so an invoice's numbering, GST split, cost/profit
-- snapshot, and stock impact can never be bypassed or half-applied by a direct
-- client write. Only SELECT is open (permission-gated).

create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  sale_type text not null check (sale_type in ('credit', 'cash')),
  customer_id uuid references public.customers(id),
  cash_customer_name text,
  cash_customer_phone text,
  route_id uuid references public.routes(id),
  staff_id uuid references public.user_profiles(id),
  invoice_date date not null default current_date,
  credit_period_days int not null default 0,
  due_date date,
  notes text,
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  taxable_total numeric(14, 2) not null default 0,
  cgst_total numeric(14, 2) not null default 0,
  sgst_total numeric(14, 2) not null default 0,
  igst_total numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  cost_total numeric(14, 2) not null default 0,
  profit_total numeric(14, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index sales_invoices_customer_idx on public.sales_invoices (customer_id);
create index sales_invoices_staff_idx on public.sales_invoices (staff_id);
create index sales_invoices_route_idx on public.sales_invoices (route_id);
create index sales_invoices_date_idx on public.sales_invoices (invoice_date);

alter table public.sales_invoices enable row level security;

create trigger sales_invoices_set_updated_at
before update on public.sales_invoices
for each row execute function public.set_updated_at();

create trigger audit_sales_invoices
after insert or update on public.sales_invoices
for each row execute function public.log_audit();

create policy "sales_invoices_select_permitted" on public.sales_invoices
  for select to authenticated
  using (public.is_admin() or public.has_permission('sales', 'view'));

create table public.sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14, 3) not null,
  rate numeric(14, 2) not null,
  discount_percent numeric(5, 2) not null default 0,
  taxable_value numeric(14, 2) not null,
  gst_percent numeric(5, 2) not null default 0,
  cgst numeric(14, 2) not null default 0,
  sgst numeric(14, 2) not null default 0,
  igst numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null,
  cost_price numeric(14, 2) not null default 0,
  profit_amount numeric(14, 2) not null default 0
);

create index sales_invoice_items_invoice_idx on public.sales_invoice_items (invoice_id);
create index sales_invoice_items_product_idx on public.sales_invoice_items (product_id);

alter table public.sales_invoice_items enable row level security;

create policy "sales_invoice_items_select_permitted" on public.sales_invoice_items
  for select to authenticated
  using (public.is_admin() or public.has_permission('sales', 'view'));
