-- Phase 3: sales_orders / sales_order_items (section 43-ish - a draft request that
-- later converts into a real invoice via create_sales_invoice). Unlike invoices,
-- orders carry no GST/profit/stock impact, so they're safe to let clients write to
-- directly (same has_permission('sales', action) pattern as Phase 2's masters)
-- rather than requiring an RPC.

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  route_id uuid references public.routes(id),
  staff_id uuid references public.user_profiles(id),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'converted', 'cancelled')),
  converted_invoice_id uuid references public.sales_invoices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index sales_orders_customer_idx on public.sales_orders (customer_id);
create index sales_orders_status_idx on public.sales_orders (status);

alter table public.sales_orders enable row level security;

create trigger sales_orders_set_updated_at
before update on public.sales_orders
for each row execute function public.set_updated_at();

create trigger audit_sales_orders
after insert or update on public.sales_orders
for each row execute function public.log_audit();

create policy "sales_orders_select_permitted" on public.sales_orders
  for select to authenticated
  using (public.is_admin() or public.has_permission('sales', 'view'));

create policy "sales_orders_insert_permitted" on public.sales_orders
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('sales', 'create'));

create policy "sales_orders_update_permitted" on public.sales_orders
  for update to authenticated
  using (public.is_admin() or public.has_permission('sales', 'edit'))
  with check (public.is_admin() or public.has_permission('sales', 'edit'));

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14, 3) not null,
  rate numeric(14, 2) not null,
  discount_percent numeric(5, 2) not null default 0
);

create index sales_order_items_order_idx on public.sales_order_items (order_id);

alter table public.sales_order_items enable row level security;

create policy "sales_order_items_select_permitted" on public.sales_order_items
  for select to authenticated
  using (public.is_admin() or public.has_permission('sales', 'view'));

create policy "sales_order_items_insert_permitted" on public.sales_order_items
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('sales', 'create'));

create policy "sales_order_items_update_permitted" on public.sales_order_items
  for update to authenticated
  using (public.is_admin() or public.has_permission('sales', 'edit'))
  with check (public.is_admin() or public.has_permission('sales', 'edit'));

create policy "sales_order_items_delete_permitted" on public.sales_order_items
  for delete to authenticated
  using (public.is_admin() or public.has_permission('sales', 'edit'));
