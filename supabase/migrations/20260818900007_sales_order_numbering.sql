-- Sales orders had no sequential, human-trackable number (just a UUID) and
-- were written to directly by the client (no RPC - orders "carry no
-- GST/profit/stock impact"). Mirrors the invoice/purchase/receipt/payment
-- <type>_prefix / next_<type>_number pattern, and folds order creation into
-- one atomic, idempotent RPC (same p_client_id pattern as create_receipt/
-- create_payment) so both the normal form submit AND the offline-sync path
-- (which previously wrote directly to sales_orders/sales_order_items with
-- no numbering at all) go through the same number allocation - closing a
-- gap where offline-synced orders would otherwise get order_number = null
-- forever.

alter table public.company_settings
  add column order_prefix text not null default 'SO',
  add column order_number_padding int not null default 4,
  add column next_order_number int not null default 1;

alter table public.sales_orders add column order_number text;

-- One-time backfill for existing rows, guarded by "order_number is null" so
-- this is safe to re-run. Stable tiebreaker (created_at, id) since bulk/
-- migrated rows can share a timestamp.
with numbered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.sales_orders
  where order_number is null
)
update public.sales_orders so
set order_number = cs.order_prefix || lpad(numbered.rn::text, cs.order_number_padding, '0')
from numbered, public.company_settings cs
where so.id = numbered.id;

-- Seed next_order_number *after* the backfill, from the actual count backfilled -
-- not the column's bare default 1 - so the first live-allocated number can't
-- collide with an already-backfilled row.
update public.company_settings
set next_order_number = (select count(*) + 1 from public.sales_orders where order_number is not null);

-- DB-level backstop alongside the RPC's row lock (every other numbered
-- document in this schema has a matching unique constraint).
create unique index sales_orders_order_number_unique on public.sales_orders (order_number) where order_number is not null;

create or replace function public.create_sales_order(
  p_customer_id uuid,
  p_route_id uuid,
  p_staff_id uuid,
  p_notes text,
  p_items jsonb,
  p_client_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_prefix text;
  v_padding int;
  v_seq int;
  v_item jsonb;
begin
  if not (public.is_admin() or public.has_permission('sales', 'create')) then
    raise exception 'Not authorized';
  end if;

  if p_client_id is not null then
    select id into v_order_id from public.sales_orders where id = p_client_id;
    if v_order_id is not null then
      return v_order_id;
    end if;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  update public.company_settings
  set next_order_number = next_order_number + 1
  where id = (select id from public.company_settings limit 1)
  returning order_prefix, (next_order_number - 1), order_number_padding
  into v_prefix, v_seq, v_padding;

  v_order_number := v_prefix || lpad(v_seq::text, v_padding, '0');

  insert into public.sales_orders (
    id, order_number, customer_id, route_id, staff_id, notes, created_by
  ) values (
    coalesce(p_client_id, gen_random_uuid()), v_order_number, p_customer_id, p_route_id, p_staff_id, p_notes, auth.uid()
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.sales_order_items (order_id, product_id, quantity, rate, discount_percent)
    values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::numeric,
      (v_item->>'rate')::numeric,
      coalesce((v_item->>'discount_percent')::numeric, 0)
    );
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_sales_order(uuid, uuid, uuid, text, jsonb, uuid) from public;
grant execute on function public.create_sales_order(uuid, uuid, uuid, text, jsonb, uuid) to authenticated;
