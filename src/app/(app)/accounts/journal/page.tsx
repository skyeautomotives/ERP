import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { Pagination } from "@/components/pagination";

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const PAGE_SIZE = 30;

type JournalEntryRow = { id: string; entry_date: string; description: string };
type JournalLineRow = {
  id: string;
  entry_id: string;
  debit_amount: number;
  credit_amount: number;
  chart_of_accounts: { id: string; code: string; name: string } | null;
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { account, from, to, page: pageParam } = await searchParams;
  // Defaults to the current month, not all-time - journal_entries is written by
  // nearly every transaction in the app, so an unbounded fetch here grows without limit.
  const fromDate = from || startOfMonthISO();
  const toDate = to || todayISO();
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const { data: accounts } = await supabase.from("chart_of_accounts").select("id, code, name").order("code");

  const { data: entries, count } = await supabase
    .from("journal_entries")
    .select("id, entry_date, description", { count: "exact" })
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate)
    .order("entry_date", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const entryRows = (entries ?? []) as JournalEntryRow[];

  const entryIds = entryRows.map((e) => e.id);
  let lines: JournalLineRow[] = [];
  if (entryIds.length > 0) {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("id, entry_id, debit_amount, credit_amount, chart_of_accounts(id, code, name)")
      .in("entry_id", entryIds);
    lines = (data ?? []) as unknown as JournalLineRow[];
  }
  if (account) {
    lines = lines.filter((l) => l.chart_of_accounts?.code === account);
  }

  const entryMap = new Map(entryRows.map((e) => [e.id, e]));
  const rows = lines
    .map((l) => ({ line: l, entry: entryMap.get(l.entry_id) }))
    .filter((r): r is { line: JournalLineRow; entry: JournalEntryRow } => Boolean(r.entry));

  const totalDebit = rows.reduce((s, r) => s + Number(r.line.debit_amount), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.line.credit_amount), 0);

  const qs = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { account, from, to, ...overrides };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Journal</h1>
        <HelpButton content={HELP_CONTENT["journal"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every entry automatically posted by a sale, purchase, receipt, payment, or adjustment. Filter by account or
        date to use this as a Cash Book, Bank Book, or Day Book.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={qs({ account: "1000", from: undefined, to: undefined })}
          className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Cash Book
        </Link>
        <Link
          href={qs({ account: "1010", from: undefined, to: undefined })}
          className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Bank Book
        </Link>
        <Link
          href={qs({ account: undefined, from: todayISO(), to: todayISO() })}
          className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Day Book (today)
        </Link>
        <Link
          href="/accounts/journal"
          className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Clear filters
        </Link>
      </div>

      <form className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Account</label>
          <select
            name="account"
            defaultValue={account ?? ""}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">All accounts</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.code}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromDate}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toDate}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Apply
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Debit</th>
              <th className="px-4 py-2 font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.line.id}>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.entry.entry_date}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.entry.description}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {r.line.chart_of_accounts?.code} - {r.line.chart_of_accounts?.name}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {Number(r.line.debit_amount) > 0 ? Number(r.line.debit_amount).toFixed(2) : "-"}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {Number(r.line.credit_amount) > 0 ? Number(r.line.credit_amount).toFixed(2) : "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right">
                  Total
                </td>
                <td className="px-4 py-2">{totalDebit.toFixed(2)}</td>
                <td className="px-4 py-2">{totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </div>
    </div>
  );
}
