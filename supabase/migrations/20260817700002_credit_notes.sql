-- Phase 8: Credit Notes - the GST-compliant document for a sales return.
-- Same lockdown as every other money/stock-critical table: select-only RLS,
-- all writes go through the RPCs in return_rpcs.sql.

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null unique,
  sales_invoice_id uuid not null references public.sales_invoices(id),
  customer_id uuid not null references public.customers(id),
  credit_note_date date not null default current_date,
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

create index credit_notes_invoice_idx on public.credit_notes (sales_invoice_id);
create index credit_notes_customer_idx on public.credit_notes (customer_id);
create index credit_notes_date_idx on public.credit_notes (credit_note_date);

alter table public.credit_notes enable row level security;

create trigger credit_notes_set_updated_at
before update on public.credit_notes
for each row execute function public.set_updated_at();

create trigger audit_credit_notes
after insert or update on public.credit_notes
for each row execute function public.log_audit();

create policy "credit_notes_select_permitted" on public.credit_notes
  for select to authenticated
  using (public.is_admin() or public.has_permission('sales', 'view'));

create table public.credit_note_items (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.credit_notes(id) on delete cascade,
  sales_invoice_item_id uuid not null references public.sales_invoice_items(id),
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

create index credit_note_items_note_idx on public.credit_note_items (credit_note_id);
create index credit_note_items_invoice_item_idx on public.credit_note_items (sales_invoice_item_id);

alter table public.credit_note_items enable row level security;

create policy "credit_note_items_select_permitted" on public.credit_note_items
  for select to authenticated
  using (public.is_admin() or public.has_permission('sales', 'view'));
