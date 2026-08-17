import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { Pagination } from "@/components/pagination";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const PAGE_SIZE = 20;
const PURPOSE_LABELS: Record<string, string> = {
  supplier: "Supplier bill",
  on_account: "On account",
  expense: "Expense",
};

export default async function CashPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const { data: payments, count } = await supabase
    .from("payments")
    .select(
      "id, payment_number, payment_date, amount, purpose, status, paid_to, suppliers(name), expense_categories(name)",
      { count: "exact" },
    )
    .eq("method", "cash")
    .order("payment_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cash Payment</h1>
          <HelpButton content={HELP_CONTENT["payments"]} />
        </div>
        {can(user, "accounts", "create") && (
          <Link
            href="/accounts/payments/cash/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New cash payment
          </Link>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Payment #</th>
              <th className="px-4 py-2 font-medium">Purpose</th>
              <th className="px-4 py-2 font-medium">To</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2">
                  <Link href={`/accounts/payments/${p.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {p.payment_number}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{PURPOSE_LABELS[p.purpose]}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {p.suppliers?.name ?? p.expense_categories?.name ?? p.paid_to ?? "-"}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.payment_date}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      p.status === "active"
                        ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!payments || payments.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No cash payments yet.
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
