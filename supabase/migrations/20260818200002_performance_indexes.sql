-- Phase 14: indexes for query patterns that existed with no supporting index.
-- (chart_of_accounts.code is already covered by its own `unique` constraint's
-- implicit index, so no action needed there.)

-- record-history.tsx runs this exact filter+order on every record-detail page
-- render (customers, products, suppliers, invoices, ...); audit_logs had zero
-- indexes despite being written on every insert/update/delete of an audited table.
create index audit_logs_table_record_created_idx
  on public.audit_logs (table_name, record_id, created_at desc);

-- stock_transactions already has a plain product_id index, but the per-product
-- stock history page and get_movement_analysis both filter by product_id AND
-- range on created_at - a composite index serves that combination directly.
create index stock_transactions_product_created_idx
  on public.stock_transactions (product_id, created_at);
