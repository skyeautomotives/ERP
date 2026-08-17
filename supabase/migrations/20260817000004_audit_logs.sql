-- Phase 1: audit_logs + log_audit() trigger (section 48).
-- Attached here to company_settings/user_profiles/role_permissions; every later
-- phase should attach the same trigger to its own tables rather than reinventing logging.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policy for any role: rows are only ever written by the
-- security definer trigger function below, never directly by a client.

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (
    TG_TABLE_NAME,
    case when TG_OP = 'DELETE' then old.id else new.id end,
    TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_company_settings
after insert or update or delete on public.company_settings
for each row execute function public.log_audit();

create trigger audit_user_profiles
after insert or update or delete on public.user_profiles
for each row execute function public.log_audit();

create trigger audit_role_permissions
after insert or update or delete on public.role_permissions
for each row execute function public.log_audit();
