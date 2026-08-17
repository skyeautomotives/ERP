-- Phase 2: Supplier/Creditor Master (section 8).

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  gstin text check (gstin is null or length(gstin) = 15),
  state text,
  credit_period_days int not null default 0,
  opening_balance numeric(14, 2) not null default 0,
  opening_balance_type text not null default 'credit' check (opening_balance_type in ('debit', 'credit')),
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  contact_person text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index suppliers_name_idx on public.suppliers using gin (to_tsvector('simple', name));

alter table public.suppliers enable row level security;

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger audit_suppliers
after insert or update or delete on public.suppliers
for each row execute function public.log_audit();

create policy "suppliers_select_permitted" on public.suppliers
  for select to authenticated
  using (public.is_admin() or public.has_permission('masters', 'view'));

create policy "suppliers_insert_permitted" on public.suppliers
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('masters', 'create'));

create policy "suppliers_update_permitted" on public.suppliers
  for update to authenticated
  using (public.is_admin() or public.has_permission('masters', 'edit'))
  with check (public.is_admin() or public.has_permission('masters', 'edit'));

create policy "suppliers_delete_permitted" on public.suppliers
  for delete to authenticated
  using (public.is_admin() or public.has_permission('masters', 'delete'));
