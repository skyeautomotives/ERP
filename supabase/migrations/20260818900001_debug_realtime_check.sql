-- TEMPORARY diagnostic migration - will be reverted immediately after use.
create or replace function public.debug_realtime_check()
returns table(tablename text, replica_identity text)
language sql
security definer
set search_path = public
as $$
  select c.relname::text, c.relreplident::text
  from pg_publication_tables pt
  join pg_class c on c.relname = pt.tablename and c.relnamespace = 'public'::regnamespace
  where pt.pubname = 'supabase_realtime'
  order by c.relname;
$$;
grant execute on function public.debug_realtime_check() to authenticated;
