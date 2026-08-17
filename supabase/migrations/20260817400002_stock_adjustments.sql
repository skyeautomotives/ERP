-- Phase 5: manual stock adjustments (section 19). No direct insert policy - only
-- create_stock_adjustment() writes, same lockdown pattern as every other
-- stock-moving table. Corrections are made by entering another adjustment, not by
-- editing/deleting an existing one.

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity_change numeric(14, 3) not null,
  reason text not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index stock_adjustments_product_idx on public.stock_adjustments (product_id);

alter table public.stock_adjustments enable row level security;

create trigger audit_stock_adjustments
after insert on public.stock_adjustments
for each row execute function public.log_audit();

create policy "stock_adjustments_select_permitted" on public.stock_adjustments
  for select to authenticated
  using (public.is_admin() or public.has_permission('inventory', 'view'));

create or replace function public.create_stock_adjustment(
  p_product_id uuid,
  p_quantity_change numeric,
  p_reason text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adjustment_id uuid;
begin
  if not (public.is_admin() or public.has_permission('inventory', 'create')) then
    raise exception 'Not authorized';
  end if;

  if p_product_id is null then
    raise exception 'Product is required';
  end if;
  if p_quantity_change is null or p_quantity_change = 0 then
    raise exception 'Quantity change must be a non-zero number';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;

  insert into public.stock_adjustments (product_id, quantity_change, reason, notes, created_by)
  values (p_product_id, p_quantity_change, p_reason, p_notes, auth.uid())
  returning id into v_adjustment_id;

  insert into public.stock_transactions (
    product_id, quantity_change, transaction_type, reference_table, reference_id, created_by
  ) values (
    p_product_id, p_quantity_change, 'adjustment', 'stock_adjustments', v_adjustment_id, auth.uid()
  );

  return v_adjustment_id;
end;
$$;

revoke all on function public.create_stock_adjustment(uuid, numeric, text, text) from public;
grant execute on function public.create_stock_adjustment(uuid, numeric, text, text) to authenticated;
