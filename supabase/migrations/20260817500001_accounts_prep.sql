-- Phase 6 prep: receipt/payment numbering (mirrors sales/purchase numbering
-- columns from Phase 1/4), and the Expense Categories master (section 24).

alter table public.company_settings
  add column receipt_prefix text not null default 'RCPT',
  add column receipt_padding int not null default 5,
  add column next_receipt_number int not null default 1,
  add column payment_prefix text not null default 'PAY',
  add column payment_padding int not null default 5,
  add column next_payment_number int not null default 1;

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.expense_categories enable row level security;

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function public.set_updated_at();

create trigger audit_expense_categories
after insert or update on public.expense_categories
for each row execute function public.log_audit();

create policy "expense_categories_select_permitted" on public.expense_categories
  for select to authenticated
  using (public.is_admin() or public.has_permission('masters', 'view'));

create policy "expense_categories_insert_permitted" on public.expense_categories
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('masters', 'create'));

create policy "expense_categories_update_permitted" on public.expense_categories
  for update to authenticated
  using (public.is_admin() or public.has_permission('masters', 'edit'))
  with check (public.is_admin() or public.has_permission('masters', 'edit'));
