-- Phase 2: Customer Master (section 6).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  gstin text check (gstin is null or length(gstin) = 15),
  state text,
  district text,
  route_id uuid references public.routes(id),
  category text,
  credit_limit numeric(14, 2) not null default 0,
  credit_period_days int not null default 0,
  opening_balance numeric(14, 2) not null default 0,
  opening_balance_type text not null default 'debit' check (opening_balance_type in ('debit', 'credit')),
  assigned_user_id uuid references public.user_profiles(id),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index customers_name_idx on public.customers using gin (to_tsvector('simple', name));
create index customers_route_idx on public.customers (route_id);
create index customers_assigned_user_idx on public.customers (assigned_user_id);

alter table public.customers enable row level security;

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger audit_customers
after insert or update or delete on public.customers
for each row execute function public.log_audit();

create policy "customers_select_permitted" on public.customers
  for select to authenticated
  using (public.is_admin() or public.has_permission('masters', 'view'));

create policy "customers_insert_permitted" on public.customers
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('masters', 'create'));

create policy "customers_update_permitted" on public.customers
  for update to authenticated
  using (public.is_admin() or public.has_permission('masters', 'edit'))
  with check (public.is_admin() or public.has_permission('masters', 'edit'));

create policy "customers_delete_permitted" on public.customers
  for delete to authenticated
  using (public.is_admin() or public.has_permission('masters', 'delete'));
