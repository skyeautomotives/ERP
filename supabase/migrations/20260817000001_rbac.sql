-- Phase 1: Roles, Permissions, Role-Permission matrix
-- Establishes the RBAC pattern every later module reuses (has_permission()).

create extension if not exists pgcrypto;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  action text not null check (action in ('view', 'create', 'edit', 'delete', 'export')),
  created_at timestamptz not null default now(),
  unique (module_key, action)
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Seed the spec's roles (section 5)
insert into public.roles (name, description, is_system) values
  ('Admin', 'Full system access', true),
  ('Accountant', 'Sales, purchase, receipts, payments, ledgers, GST, financial reports', true),
  ('Sales Staff', 'Customers, sales orders, assigned collections', true),
  ('Store/Inventory Staff', 'Stock, purchase, stock adjustments, stock reports', true),
  ('Management', 'Dashboard, analysis, staff performance, financial reports (view-only)', true);

-- Seed permissions for each top-level module (section 55 nav) x action.
-- Finer-grained (per-submodule) permissions will be added when those modules are built.
insert into public.permissions (module_key, action)
select module_key, action
from unnest(array[
  'dashboard','sales','purchase','inventory','accounts',
  'gst','staff','reports','masters','settings'
]) as module_key
cross join unnest(array['view','create','edit','delete','export']) as action;

-- Admin: everything
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Admin';

-- Accountant: view/create/edit on sales, purchase, accounts, gst, reports
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module_key in ('sales', 'purchase', 'accounts', 'gst', 'reports')
  and p.action in ('view', 'create', 'edit')
where r.name = 'Accountant';

-- Sales Staff: view/create on dashboard, sales, accounts (receipts), view masters (customers)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on
  (p.module_key in ('dashboard', 'sales', 'accounts') and p.action in ('view', 'create'))
  or (p.module_key = 'masters' and p.action = 'view')
where r.name = 'Sales Staff';

-- Store/Inventory Staff: view/create/edit on inventory and purchase
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module_key in ('inventory', 'purchase')
  and p.action in ('view', 'create', 'edit')
where r.name = 'Store/Inventory Staff';

-- Management: view-only across dashboard, reports, staff, sales, purchase, gst
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module_key in ('dashboard', 'reports', 'staff', 'sales', 'purchase', 'gst')
  and p.action = 'view'
where r.name = 'Management';
