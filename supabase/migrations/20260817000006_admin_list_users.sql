-- Phase 1: admin-only RPC to list users with their auth email (user_profiles has no
-- email column - email only lives in auth.users, which client code can't query directly).

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role_name text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select u.id, u.email::text, up.full_name, r.name, up.is_active, up.created_at
    from public.user_profiles up
    join auth.users u on u.id = up.id
    join public.roles r on r.id = up.role_id
    order by up.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
