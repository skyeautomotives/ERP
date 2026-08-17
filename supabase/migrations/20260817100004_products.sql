-- Phase 2: Product/Stock Master (section 9).
-- last_purchase_rate/last_selling_rate and CGST/SGST/IGST split are intentionally
-- excluded here - they only become real data once Purchase/Sales entry (Phase 3/4)
-- exists to populate them. gst_percent is the single source of truth for tax rate;
-- the CGST/SGST/IGST split is computed per-transaction later based on buyer/seller
-- state, not stored as a fixed product attribute.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  brand text,
  product_group text,
  product_sub_group text,
  hsn_code text,
  unit text,
  pack_size text,
  mrp numeric(14, 2),
  purchase_rate numeric(14, 2),
  selling_rate numeric(14, 2),
  landing_cost numeric(14, 2),
  gst_percent numeric(5, 2) not null default 0,
  opening_qty numeric(14, 3) not null default 0,
  opening_value numeric(14, 2) not null default 0,
  min_stock_level numeric(14, 3) not null default 0,
  max_stock_level numeric(14, 3),
  batch_number text,
  expiry_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index products_name_idx on public.products using gin (to_tsvector('simple', name));
create index products_code_idx on public.products (code);
create index products_group_idx on public.products (product_group);

alter table public.products enable row level security;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger audit_products
after insert or update or delete on public.products
for each row execute function public.log_audit();

create policy "products_select_permitted" on public.products
  for select to authenticated
  using (public.is_admin() or public.has_permission('masters', 'view'));

create policy "products_insert_permitted" on public.products
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('masters', 'create'));

create policy "products_update_permitted" on public.products
  for update to authenticated
  using (public.is_admin() or public.has_permission('masters', 'edit'))
  with check (public.is_admin() or public.has_permission('masters', 'edit'));

create policy "products_delete_permitted" on public.products
  for delete to authenticated
  using (public.is_admin() or public.has_permission('masters', 'delete'));
