-- Phase 7: Chart of Accounts (section 35). A lean, fixed set of 12 accounts -
-- view-only for now, since a custom account added here couldn't receive any
-- postings without a manual journal entry screen (a later fast-follow).

create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.chart_of_accounts enable row level security;

create trigger chart_of_accounts_set_updated_at
before update on public.chart_of_accounts
for each row execute function public.set_updated_at();

create trigger audit_chart_of_accounts
after insert or update on public.chart_of_accounts
for each row execute function public.log_audit();

create policy "chart_of_accounts_select_permitted" on public.chart_of_accounts
  for select to authenticated
  using (public.is_admin() or public.has_permission('masters', 'view'));

insert into public.chart_of_accounts (code, name, account_type) values
  ('1000', 'Cash', 'asset'),
  ('1010', 'Bank', 'asset'),
  ('1100', 'Accounts Receivable', 'asset'),
  ('1200', 'Inventory', 'asset'),
  ('1300', 'GST Input Credit', 'asset'),
  ('2000', 'Accounts Payable', 'liability'),
  ('2100', 'GST Payable', 'liability'),
  ('3000', 'Opening Balance Equity', 'equity'),
  ('4000', 'Sales Income', 'income'),
  ('5000', 'Cost of Goods Sold', 'expense'),
  ('5100', 'Operating Expenses', 'expense'),
  ('5200', 'Inventory Adjustments', 'expense');

-- Helper used by every posting trigger function below.
create or replace function public.coa_id(p_code text)
returns uuid
language sql
stable
set search_path = public
as $$
  select id from public.chart_of_accounts where code = p_code;
$$;
