import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;

export default async function CashSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) redirect("/unauthorized");

  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("sales_invoices")
    .select(
      "id, invoice_number, invoice_date, total_amount, status, cash_customer_name, customers(name)",
      { count: "exact" },
    )
    .eq("sale_type", "cash");

  if (q) query = query.ilike("invoice_number", `%${q}%`);

  const { data: invoices, count } = await query
    .order("invoice_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cash Sales</h1>
        {can(user, "sales", "create") && (
          <Link
            href="/sales/cash/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New cash sale
          </Link>
        )}
      </div>

      <div className="mt-4">
        <SearchInput placeholder="Search invoice number..." />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Invoice #</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2">
                  <Link href={`/sales/${inv.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{inv.invoice_date}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{inv.customers?.name ?? inv.cash_customer_name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(inv.total_amount).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      inv.status === "active" ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No cash sales yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </div>
    </div>
  );
}
