-- Phase 1: company_settings — single-agency company profile (Settings > Company, section 55).
-- Feeds printable invoices later (section 50).

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  gstin text,
  phone text,
  email text,
  logo_url text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  invoice_terms text,
  invoice_prefix text not null default 'INV',
  invoice_number_padding int not null default 5,
  next_invoice_number int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- Enforce a single row (singleton settings record) via a constant-expression unique index.
create unique index company_settings_singleton on public.company_settings ((true));

alter table public.company_settings enable row level security;

create trigger company_settings_set_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

create policy "company_settings_select_authenticated" on public.company_settings
  for select to authenticated using (true);

create policy "company_settings_write_admin_or_permitted" on public.company_settings
  for all to authenticated
  using (public.is_admin() or public.has_permission('settings', 'edit'))
  with check (public.is_admin() or public.has_permission('settings', 'edit'));

-- Seed the one settings row so the app always UPDATEs, never has to handle "no row yet".
insert into public.company_settings (name) values ('My Distribution Agency');
