-- PostgREST's schema cache didn't pick up sales_invoice_outstanding's
-- CREATE OR REPLACE VIEW from the previous migration (embedded relationship
-- queries via sales_invoice_outstanding -> sales_invoices started failing
-- with PGRST200 "Could not find a relationship"). Force a reload.
notify pgrst, 'reload schema';
