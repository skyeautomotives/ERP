-- Phase 10: configurable collection-incentive slabs (spec section 33) -
-- seeded with the spec's own example rates. Rates are admin-editable;
-- day-range boundaries are technically editable too (nothing enforces
-- otherwise) but the UI only exposes the rate, since arbitrary boundary
-- edits could create gaps/overlaps in coverage.

create table public.collection_incentive_slabs (
  id uuid primary key default gen_random_uuid(),
  slab_label text not null,
  min_days int not null,
  max_days int,
  incentive_rate numeric(5, 2) not null,
  display_order int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.collection_incentive_slabs enable row level security;

create trigger collection_incentive_slabs_set_updated_at
before update on public.collection_incentive_slabs
for each row execute function public.set_updated_at();

create trigger audit_collection_incentive_slabs
after insert or update on public.collection_incentive_slabs
for each row execute function public.log_audit();

create policy "collection_incentive_slabs_select_permitted" on public.collection_incentive_slabs
  for select to authenticated
  using (public.is_admin() or public.has_permission('staff', 'view'));

create policy "collection_incentive_slabs_update_permitted" on public.collection_incentive_slabs
  for update to authenticated
  using (public.is_admin() or public.has_permission('staff', 'edit'))
  with check (public.is_admin() or public.has_permission('staff', 'edit'));

insert into public.collection_incentive_slabs (slab_label, min_days, max_days, incentive_rate, display_order) values
  ('Ready Cash / Immediate', 0, 0, 2.00, 1),
  ('1-15 Days', 1, 15, 1.50, 2),
  ('16-30 Days', 16, 30, 1.25, 3),
  ('31-40 Days', 31, 40, 1.00, 4),
  ('41-45 Days', 41, 45, 0.80, 5),
  ('46-60 Days', 46, 60, 0.60, 6),
  ('61-90 Days', 61, 90, 0.30, 7),
  ('90+ Days', 91, null, 0.00, 8);
