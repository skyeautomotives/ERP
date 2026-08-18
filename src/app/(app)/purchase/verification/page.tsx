import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { Pagination } from "@/components/pagination";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ModuleTabs } from "@/components/module-tabs";
import { PURCHASE_TABS } from "../purchase-tabs";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  matched: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  partial: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
  mismatch: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Verification",
  matched: "Matched",
  partial: "Partially Matched",
  mismatch: "Mismatch",
};
const STATUS_FILTERS = ["all", "pending", "matched", "partial", "mismatch"];

export default async function PurchaseVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "view")) redirect("/unauthorized");

  const { status: statusFilter, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const { data: invoices, count } = await supabase
    .from("purchase_invoices")
    .select(
      "id, our_reference_number, supplier_invoice_number, supplier_invoice_date, total_amount, suppliers(name), purchase_verifications(status, supplier_total)",
      { count: "exact" },
    )
    .eq("status", "active")
    .order("supplier_invoice_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const rows = (invoices ?? []).map((inv) => {
    const verification = Array.isArray(inv.purchase_verifications)
      ? inv.purchase_verifications[0]
      : inv.purchase_verifications;
    const status = verification?.status ?? "pending";
    const diff = verification?.supplier_total != null ? Number(verification.supplier_total) - Number(inv.total_amount) : null;
    return { ...inv, status, diff };
  });

  const filteredRows = statusFilter && statusFilter !== "all" ? rows.filter((r) => r.status === statusFilter) : rows;

  return (
    <div>
      <ModuleTabs tabs={PURCHASE_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Purchase Bill Verification</h1>
        <HelpButton content={HELP_CONTENT["purchase-verification"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Compare what the supplier&apos;s paper invoice says against what was entered here. Click an invoice to
        record or update its verification.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/purchase/verification" : `/purchase/verification?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              (statusFilter ?? "all") === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Reference #</th>
              <th className="px-4 py-2 font-medium">Supplier</th>
              <th className="px-4 py-2 font-medium">ERP total</th>
              <th className="px-4 py-2 font-medium">Difference</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredRows.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2">
                  <Link
                    href={`/purchase/entries/${inv.id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {inv.our_reference_number}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{inv.suppliers?.name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(inv.total_amount).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {inv.diff !== null ? `Rs.${Math.abs(inv.diff).toFixed(2)}` : "-"}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No purchase invoices match this filter.
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
