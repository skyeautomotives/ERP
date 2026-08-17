-- Phase 8: Debit Notes - the GST-compliant document for a purchase return.
-- Mirrors credit_notes exactly.

create table public.debit_notes (
  id uuid primary key default gen_random_uuid(),
  debit_note_number text not null unique,
  purchase_invoice_id uuid not null references public.purchase_invoices(id),
  supplier_id uuid not null references public.suppliers(id),
  debit_note_date date not null default current_date,
  reason text not null,
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  taxable_total numeric(14, 2) not null default 0,
  cgst_total numeric(14, 2) not null default 0,
  sgst_total numeric(14, 2) not null default 0,
  igst_total numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index debit_notes_invoice_idx on public.debit_notes (purchase_invoice_id);
create index debit_notes_supplier_idx on public.debit_notes (supplier_id);
create index debit_notes_date_idx on public.debit_notes (debit_note_date);

alter table public.debit_notes enable row level security;

create trigger debit_notes_set_updated_at
before update on public.debit_notes
for each row execute function public.set_updated_at();

create trigger audit_debit_notes
after insert or update on public.debit_notes
for each row execute function public.log_audit();

create policy "debit_notes_select_permitted" on public.debit_notes
  for select to authenticated
  using (public.is_admin() or public.has_permission('purchase', 'view'));

create table public.debit_note_items (
  id uuid primary key default gen_random_uuid(),
  debit_note_id uuid not null references public.debit_notes(id) on delete cascade,
  purchase_invoice_item_id uuid not null references public.purchase_invoice_items(id),
  product_id uuid not null references public.products(id),
  quantity numeric(14, 3) not null,
  rate numeric(14, 2) not null,
  discount_percent numeric(5, 2) not null default 0,
  taxable_value numeric(14, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 0,
  cgst numeric(14, 2) not null default 0,
  sgst numeric(14, 2) not null default 0,
  igst numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0
);

create index debit_note_items_note_idx on public.debit_note_items (debit_note_id);
create index debit_note_items_invoice_item_idx on public.debit_note_items (purchase_invoice_item_id);

alter table public.debit_note_items enable row level security;

create policy "debit_note_items_select_permitted" on public.debit_note_items
  for select to authenticated
  using (public.is_admin() or public.has_permission('purchase', 'view'));
