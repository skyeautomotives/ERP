-- Drops the temporary diagnostic function from 20260818900001, added while
-- investigating why e2e/mobile.spec.ts's realtime synchronization test never
-- saw postgres_changes events on a second, freshly-authenticated browser
-- context. It confirmed sales_invoices/receipts/etc. were correctly present
-- in the supabase_realtime publication - the actual bug turned out to be in
-- src/components/realtime-refresh.tsx (missing an explicit
-- supabase.realtime.setAuth() call before subscribing, so RLS-gated
-- postgres_changes broadcasts were silently dropped for sessions hydrated
-- from cookies rather than an in-page sign-in). No longer needed.

drop function if exists public.debug_realtime_check();
