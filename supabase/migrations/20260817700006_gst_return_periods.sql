-- Phase 8: manual GST return status tracking (section 37 - Draft / Verified /
-- Ready for filing / Filed). This table does not move money or file anything -
-- it is a checklist an admin/accountant updates by hand after doing the real
-- filing themselves on the government portal. Normal has_permission-gated
-- CRUD, not RPC-locked, same as any other plain master/workflow table.

create table public.gst_return_periods (
  id uuid primary key default gen_random_uuid(),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year between 2000 and 2100),
  return_type text not null check (return_type in ('GSTR-1', 'GSTR-3B')),
  status text not null default 'draft' check (status in ('draft', 'verified', 'ready_for_filing', 'filed')),
  notes text,
  filed_reference_number text,
  status_updated_by uuid references auth.users(id),
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (period_month, period_year, return_type)
);

alter table public.gst_return_periods enable row level security;

create trigger audit_gst_return_periods
after insert or update on public.gst_return_periods
for each row execute function public.log_audit();

create policy "gst_return_periods_select_permitted" on public.gst_return_periods
  for select to authenticated
  using (public.is_admin() or public.has_permission('gst', 'view'));

create policy "gst_return_periods_insert_permitted" on public.gst_return_periods
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('gst', 'create'));

create policy "gst_return_periods_update_permitted" on public.gst_return_periods
  for update to authenticated
  using (public.is_admin() or public.has_permission('gst', 'edit'))
  with check (public.is_admin() or public.has_permission('gst', 'edit'));
