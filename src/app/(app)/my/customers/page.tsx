import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function MyCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, name, phone, route_id, credit_limit, routes(name)")
    .eq("assigned_user_id", user.id)
    .eq("is_active", true);

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: customers } = await query.order("name");
  const customerIds = (customers ?? []).map((c) => c.id);

  const { data: outstandingRows } =
    customerIds.length > 0
      ? await supabase
          .from("sales_invoice_outstanding")
          .select("customer_id, outstanding_amount")
          .in("customer_id", customerIds)
          .eq("status", "active")
      : { data: [] as { customer_id: string; outstanding_amount: number }[] };

  const outstandingByCustomer = new Map<string, number>();
  for (const r of outstandingRows ?? []) {
    if (!r.customer_id) continue;
    outstandingByCustomer.set(r.customer_id, (outstandingByCustomer.get(r.customer_id) ?? 0) + Number(r.outstanding_amount));
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Customers</h1>
        <HelpButton content={HELP_CONTENT["my-customers"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Customers assigned to you.</p>

      <div className="mt-4">
        <SearchInput placeholder="Search my customers..." />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="px-4 py-2 font-medium">Outstanding</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(customers ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.phone ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.routes?.name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {(outstandingByCustomer.get(c.id) ?? 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/accounts/customer-ledger?customerId=${c.id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View ledger
                  </Link>
                </td>
              </tr>
            ))}
            {(!customers || customers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No customers assigned to you yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
