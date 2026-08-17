-- Phase 6: receipts / payments (sections 20-23). Cash and Bank share one table
-- each via a `method` column, same simplification as sales_invoices.sale_type.
-- Same lockdown as every money-moving table so far: no direct insert/update
-- policy - only the create_/cancel_ RPCs write.

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  method text not null check (method in ('cash', 'bank')),
  customer_id uuid not null references public.customers(id),
  mode text not null check (mode in ('bill', 'on_account')),
  amount numeric(14, 2) not null,
  receipt_date date not null default current_date,
  reference_number text,
  notes text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index receipts_customer_idx on public.receipts (customer_id);
create index receipts_date_idx on public.receipts (receipt_date);

alter table public.receipts enable row level security;

create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function public.set_updated_at();

create trigger audit_receipts
after insert or update on public.receipts
for each row execute function public.log_audit();

create policy "receipts_select_permitted" on public.receipts
  for select to authenticated
  using (public.is_admin() or public.has_permission('accounts', 'view'));

create table public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  sales_invoice_id uuid not null references public.sales_invoices(id),
  amount_allocated numeric(14, 2) not null
);

create index receipt_allocations_receipt_idx on public.receipt_allocations (receipt_id);
create index receipt_allocations_invoice_idx on public.receipt_allocations (sales_invoice_id);

alter table public.receipt_allocations enable row level security;

create policy "receipt_allocations_select_permitted" on public.receipt_allocations
  for select to authenticated
  using (public.is_admin() or public.has_permission('accounts', 'view'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique,
  method text not null check (method in ('cash', 'bank')),
  purpose text not null check (purpose in ('supplier', 'on_account', 'expense')),
  supplier_id uuid references public.suppliers(id),
  expense_category_id uuid references public.expense_categories(id),
  paid_to text,
  amount numeric(14, 2) not null,
  payment_date date not null default current_date,
  reference_number text,
  notes text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index payments_supplier_idx on public.payments (supplier_id);
create index payments_expense_category_idx on public.payments (expense_category_id);
create index payments_date_idx on public.payments (payment_date);

alter table public.payments enable row level security;

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger audit_payments
after insert or update on public.payments
for each row execute function public.log_audit();

create policy "payments_select_permitted" on public.payments
  for select to authenticated
  using (public.is_admin() or public.has_permission('accounts', 'view'));

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  purchase_invoice_id uuid not null references public.purchase_invoices(id),
  amount_allocated numeric(14, 2) not null
);

create index payment_allocations_payment_idx on public.payment_allocations (payment_id);
create index payment_allocations_invoice_idx on public.payment_allocations (purchase_invoice_id);

alter table public.payment_allocations enable row level security;

create policy "payment_allocations_select_permitted" on public.payment_allocations
  for select to authenticated
  using (public.is_admin() or public.has_permission('accounts', 'view'));
