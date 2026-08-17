-- Phase 1: storage bucket for the company logo (Settings > Company, section 6/50).
-- Public read (invoices/printouts need to render the logo without auth), writes gated
-- by the same settings:edit permission as the company_settings table itself.

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

create policy "company_assets_public_read" on storage.objects
  for select using (bucket_id = 'company-assets');

create policy "company_assets_insert_admin_or_permitted" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-assets'
    and (public.is_admin() or public.has_permission('settings', 'edit'))
  );

create policy "company_assets_update_admin_or_permitted" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-assets'
    and (public.is_admin() or public.has_permission('settings', 'edit'))
  )
  with check (
    bucket_id = 'company-assets'
    and (public.is_admin() or public.has_permission('settings', 'edit'))
  );

create policy "company_assets_delete_admin_or_permitted" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-assets'
    and (public.is_admin() or public.has_permission('settings', 'edit'))
  );
