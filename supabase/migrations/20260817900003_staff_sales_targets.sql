-- Phase 10: per-staff monthly sales targets, so "Target"/"Achievement" on
-- the Incentive Dashboard have something to compare against. Same plain
-- has_permission-gated CRUD pattern as gst_return_periods (Phase 8) - this
-- is configuration, not a money-moving transaction.

create table public.staff_sales_targets (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.user_profiles(id),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year between 2000 and 2100),
  target_amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (staff_id, period_month, period_year)
);

alter table public.staff_sales_targets enable row level security;

create trigger staff_sales_targets_set_updated_at
before update on public.staff_sales_targets
for each row execute function public.set_updated_at();

create trigger audit_staff_sales_targets
after insert or update on public.staff_sales_targets
for each row execute function public.log_audit();

create policy "staff_sales_targets_select_permitted" on public.staff_sales_targets
  for select to authenticated
  using (public.is_admin() or public.has_permission('staff', 'view'));

create policy "staff_sales_targets_insert_permitted" on public.staff_sales_targets
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('staff', 'create'));

create policy "staff_sales_targets_update_permitted" on public.staff_sales_targets
  for update to authenticated
  using (public.is_admin() or public.has_permission('staff', 'edit'))
  with check (public.is_admin() or public.has_permission('staff', 'edit'));
