-- Phase 3: minimal stock movement ledger. Introduced here (not Phase 5) because Sales
-- can't honestly decrement stock without something to decrement into. Phase 5
-- (Inventory) builds reporting - valuation, low/fast-moving, adjustments - on top of
-- this ledger; it doesn't redefine it. Current stock for a product is
-- opening_qty + sum(quantity_change).
--
-- No insert/update/delete policy is defined for 'authenticated' - rows are only ever
-- written by security-definer RPCs (create_sales_invoice / cancel_sales_invoice),
-- never directly by a client, same pattern as audit_logs in Phase 1.

create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity_change numeric(14, 3) not null,
  transaction_type text not null,
  reference_table text,
  reference_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index stock_transactions_product_idx on public.stock_transactions (product_id);
create index stock_transactions_reference_idx on public.stock_transactions (reference_table, reference_id);

alter table public.stock_transactions enable row level security;

create policy "stock_transactions_select_permitted" on public.stock_transactions
  for select to authenticated
  using (public.is_admin() or public.has_permission('inventory', 'view') or public.has_permission('sales', 'view'));
