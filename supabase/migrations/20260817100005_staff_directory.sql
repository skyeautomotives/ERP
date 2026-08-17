-- Phase 2: broaden user_profiles read access so any authenticated user can populate
-- "assigned staff" dropdowns (customers, routes, and every future module that assigns
-- work to a user). Deactivated accounts stay hidden from the general directory - only
-- the account owner or an admin can still see those. No new PII is exposed: user_profiles
-- has no email column (that lives in auth.users, only reachable via the admin-only
-- admin_list_users() RPC from Phase 1).

drop policy "user_profiles_select_self_or_admin" on public.user_profiles;

create policy "user_profiles_select_directory" on public.user_profiles
  for select to authenticated
  using (is_active or id = auth.uid() or public.is_admin());
