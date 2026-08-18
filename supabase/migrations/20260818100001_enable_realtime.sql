-- Phase 13: enable Postgres logical replication for the tables the realtime
-- pages (Dashboard, My Workspace, Customer Ledger, Bill-wise Outstanding,
-- Staff Performance, Collection Report - spec section 47) read from, so
-- client-side postgres_changes subscriptions can fire on them.

alter publication supabase_realtime add table
  public.sales_invoices,
  public.receipts,
  public.receipt_allocations,
  public.payments,
  public.payment_allocations,
  public.journal_entries;
