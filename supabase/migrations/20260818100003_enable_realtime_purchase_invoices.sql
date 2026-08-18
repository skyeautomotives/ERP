-- Fix: Bill-wise Outstanding's realtime subscription (accounts/outstanding)
-- needs purchase_invoices too (supplier-side outstanding), missed in the
-- initial enable_realtime migration which only covered the sales-side tables.

alter publication supabase_realtime add table public.purchase_invoices;
