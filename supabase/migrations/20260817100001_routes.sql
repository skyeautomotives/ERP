-- Phase 2: Route Master (section 7).

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  assigned_user_id uuid references public.user_profiles(id),
  route_days text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.routes enable row level security;

create trigger routes_set_updated_at
before update on public.routes
for each row execute function public.set_updated_at();

create trigger audit_routes
after insert or update or delete on public.routes
for each row execute function public.log_audit();

create policy "routes_select_permitted" on public.routes
  for select to authenticated
  using (public.is_admin() or public.has_permission('masters', 'view'));

create policy "routes_insert_permitted" on public.routes
  for insert to authenticated
  with check (public.is_admin() or public.has_permission('masters', 'create'));

create policy "routes_update_permitted" on public.routes
  for update to authenticated
  using (public.is_admin() or public.has_permission('masters', 'edit'))
  with check (public.is_admin() or public.has_permission('masters', 'edit'));

create policy "routes_delete_permitted" on public.routes
  for delete to authenticated
  using (public.is_admin() or public.has_permission('masters', 'delete'));
