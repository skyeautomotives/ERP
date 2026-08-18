import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Every test-created record gets this prefix in its name/notes field so it's
// identifiable in reports and (for anything cancel-only, like invoices/receipts)
// findable for a later bulk audit - see docs/DEV_LOG.md Phase 14 notes.
export const TAG = "PW-TEST-";

export function tag(name: string) {
  return `${TAG}${name}`;
}

let cached: SupabaseClient | null = null;

// A second, independent Supabase session (same E2E admin user, not the browser's
// session) used by tests to set up master data via RPCs/admin-permitted table
// writes and to assert directly against the database - matching this project's
// established "cross-check the database, not just the UI" practice.
export async function dbClient(): Promise<SupabaseClient> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_PASSWORD!,
  });
  if (error) throw new Error(`e2e helper sign-in failed: ${error.message}`);
  cached = client;
  return client;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

// supabase-js query/RPC builders are PromiseLike (implement .then()) but not full
// Promises, so a bare `.catch()` on one throws "catch is not a function" - this
// wraps a builder in a real async function so cleanup calls can safely ignore
// individual failures (e.g. "already cancelled") without aborting the rest.
export async function safely(fn: () => PromiseLike<unknown>) {
  try {
    await fn();
  } catch {
    // best-effort cleanup - a single failed cancel/delete shouldn't abort the rest
  }
}

// Master data (customers, products, routes, suppliers, ...) can't be hard-deleted
// once it's been used in any transaction - even a cancelled one - because the
// transaction's line items still hold a foreign key to it (same "cancel, never
// delete" philosophy the app itself follows; master data is deactivated, not
// deleted). So test setup reuses the same tagged row across runs instead of
// creating-then-deleting a fresh one every time: idempotent by construction, and
// avoids master-data rows piling up in the live project with every CI run.
export async function findOrCreate<T extends Record<string, unknown>>(
  db: SupabaseClient,
  table: string,
  matchColumn: string,
  matchValue: string,
  insertFields: T,
): Promise<string> {
  const { data: existing } = await db.from(table).select("id").eq(matchColumn, matchValue).maybeSingle();
  if (existing) {
    await db.from(table).update({ is_active: true }).eq("id", existing.id);
    return existing.id as string;
  }
  const { data: created, error } = await db.from(table).insert(insertFields).select("id").single();
  if (error) throw error;
  return created.id as string;
}
