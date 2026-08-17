-- Phase 7: the general ledger itself. Locked down tighter than any table so far -
-- not even an RPC can write to these, only the security-definer trigger functions
-- in the next migration (same write-through-trigger pattern log_audit() already uses).

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  description text not null,
  source_table text not null,
  source_id uuid not null,
  reversed_entry_id uuid references public.journal_entries(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index journal_entries_date_idx on public.journal_entries (entry_date);
create index journal_entries_source_idx on public.journal_entries (source_table, source_id);

alter table public.journal_entries enable row level security;

create policy "journal_entries_select_permitted" on public.journal_entries
  for select to authenticated
  using (public.is_admin() or public.has_permission('accounts', 'view'));

create table public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id),
  debit_amount numeric(14, 2) not null default 0,
  credit_amount numeric(14, 2) not null default 0
);

create index journal_entry_lines_entry_idx on public.journal_entry_lines (entry_id);
create index journal_entry_lines_account_idx on public.journal_entry_lines (account_id);

alter table public.journal_entry_lines enable row level security;

create policy "journal_entry_lines_select_permitted" on public.journal_entry_lines
  for select to authenticated
  using (public.is_admin() or public.has_permission('accounts', 'view'));
