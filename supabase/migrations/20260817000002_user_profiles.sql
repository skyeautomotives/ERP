-- Phase 1: user_profiles (1:1 with auth.users) + permission-check helper functions.
-- has_permission()/is_admin() are the reusable pattern every later module's RLS policies call.

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role_id uuid not null references public.roles(id),
  staff_id uuid, -- placeholder FK to the Staff Master table added in a later phase
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.user_profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- Current caller's role name. security definer: reads user_profiles/roles regardless
-- of RLS on those tables, but is scoped to auth.uid() so it only ever reveals the
-- caller's own role.
create or replace function public.current_role_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select r.name
  from public.user_profiles up
  join public.roles r on r.id = up.role_id
  where up.id = auth.uid() and up.is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role_name() = 'Admin'
$$;

-- The reusable permission check every module's RLS policies (and the app's
-- lib/auth/permissions.ts) should call: has_permission('sales', 'edit') etc.
create or replace function public.has_permission(p_module text, p_action text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.role_permissions rp on rp.role_id = up.role_id
    join public.permissions p on p.id = rp.permission_id
    where up.id = auth.uid()
      and up.is_active = true
      and p.module_key = p_module
      and p.action = p_action
  )
$$;

-- What the current user is allowed to do, for building nav/UI without exposing
-- the full role_permissions matrix to non-admins.
create or replace function public.my_permissions()
returns table(module_key text, action text)
language sql
security definer
set search_path = public
stable
as $$
  select p.module_key, p.action
  from public.user_profiles up
  join public.role_permissions rp on rp.role_id = up.role_id
  join public.permissions p on p.id = rp.permission_id
  where up.id = auth.uid() and up.is_active = true
$$;

-- ---- RLS policies (now that is_admin()/has_permission() exist) ----

create policy "roles_select_authenticated" on public.roles
  for select to authenticated using (true);
create policy "roles_write_admin" on public.roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "permissions_select_authenticated" on public.permissions
  for select to authenticated using (true);
create policy "permissions_write_admin" on public.permissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "role_permissions_select_admin" on public.role_permissions
  for select to authenticated using (public.is_admin());
create policy "role_permissions_write_admin" on public.role_permissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "user_profiles_select_self_or_admin" on public.user_profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "user_profiles_write_admin" on public.user_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
