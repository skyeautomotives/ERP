-- Phase 4: Purchase Bill Verification (section 17). Status is always computed by
-- the record_purchase_verification RPC from the stored supplier-stated figures vs
-- the ERP invoice totals - never client-set, so a verifier can't just mark
-- something "Matched" without the numbers actually agreeing.

create table public.purchase_verifications (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid not null unique references public.purchase_invoices(id),
  supplier_taxable_value numeric(14, 2),
  supplier_gst_total numeric(14, 2),
  supplier_total numeric(14, 2),
  status text not null default 'pending' check (status in ('pending', 'matched', 'partial', 'mismatch')),
  notes text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchase_verifications enable row level security;

create trigger purchase_verifications_set_updated_at
before update on public.purchase_verifications
for each row execute function public.set_updated_at();

create policy "purchase_verifications_select_permitted" on public.purchase_verifications
  for select to authenticated
  using (public.is_admin() or public.has_permission('purchase', 'view'));
