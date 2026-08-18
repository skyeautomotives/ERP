import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { RealtimeRefresh } from "@/components/realtime-refresh";

const BUCKETS = ["Not yet due", "0-15 days", "16-30 days", "31-45 days", "46-60 days", "61-90 days", "90+ days"] as const;

function ageingBucket(daysOverdue: number): (typeof BUCKETS)[number] {
  if (daysOverdue <= 0) return "Not yet due";
  if (daysOverdue <= 15) return "0-15 days";
  if (daysOverdue <= 30) return "16-30 days";
  if (daysOverdue <= 45) return "31-45 days";
  if (daysOverdue <= 60) return "46-60 days";
  if (daysOverdue <= 90) return "61-90 days";
  return "90+ days";
}

const todayISO = () => new Date().toISOString().slice(0, 10);
function daysBetween(from: string, to: string) {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

type Row = {
  id: string;
  number: string;
  party: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  bucket: (typeof BUCKETS)[number];
};

export default async function OutstandingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { type } = await searchParams;
  const activeTab = type === "supplier" ? "supplier" : "customer";
  const today = todayISO();
  const supabase = await createClient();

  let rows: Row[] = [];
  if (activeTab === "customer") {
    const { data } = await supabase
      .from("sales_invoice_outstanding")
      .select("invoice_id, invoice_number, customer_name, invoice_date, due_date, total_amount, outstanding_amount, status")
      .eq("status", "active")
      .gt("outstanding_amount", 0);
    rows = (data ?? []).map((r) => {
      const dueDate = r.due_date || r.invoice_date || today;
      const daysOverdue = daysBetween(dueDate, today);
      return {
        id: r.invoice_id as string,
        number: r.invoice_number as string,
        party: r.customer_name ?? "-",
        invoiceDate: r.invoice_date ?? "-",
        dueDate,
        totalAmount: Number(r.total_amount),
        outstandingAmount: Number(r.outstanding_amount),
        daysOverdue,
        bucket: ageingBucket(daysOverdue),
      };
    });
  } else {
    const { data } = await supabase
      .from("purchase_invoice_outstanding")
      .select("invoice_id, our_reference_number, supplier_name, supplier_invoice_date, due_date, total_amount, outstanding_amount, status")
      .eq("status", "active")
      .gt("outstanding_amount", 0);
    rows = (data ?? []).map((r) => {
      const dueDate = r.due_date || r.supplier_invoice_date || today;
      const daysOverdue = daysBetween(dueDate, today);
      return {
        id: r.invoice_id as string,
        number: r.our_reference_number as string,
        party: r.supplier_name ?? "-",
        invoiceDate: r.supplier_invoice_date ?? "-",
        dueDate,
        totalAmount: Number(r.total_amount),
        outstandingAmount: Number(r.outstanding_amount),
        daysOverdue,
        bucket: ageingBucket(daysOverdue),
      };
    });
  }

  rows.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const bucketTotals = new Map<string, number>();
  for (const r of rows) bucketTotals.set(r.bucket, (bucketTotals.get(r.bucket) ?? 0) + r.outstandingAmount);
  const grandTotal = rows.reduce((s, r) => s + r.outstandingAmount, 0);

  return (
    <div>
      <RealtimeRefresh tables={["sales_invoices", "purchase_invoices", "receipts", "receipt_allocations", "payments", "payment_allocations"]} />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bill-wise Outstanding</h1>
        <HelpButton content={HELP_CONTENT["outstanding"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every unpaid invoice, sorted by how overdue it is - use this to prioritize collections or payments.
      </p>

      <div className="mt-4 flex gap-2">
        <Link
          href="/accounts/outstanding?type=customer"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            activeTab === "customer"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Customers owe you
        </Link>
        <Link
          href="/accounts/outstanding?type=supplier"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            activeTab === "supplier"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          You owe suppliers
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Rs.{grandTotal.toFixed(2)}</p>
        </div>
        {BUCKETS.map((b) => (
          <div key={b} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{b}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Rs.{(bucketTotals.get(b) ?? 0).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Invoice</th>
              <th className="px-4 py-2 font-medium">{activeTab === "customer" ? "Customer" : "Supplier"}</th>
              <th className="px-4 py-2 font-medium">Invoice date</th>
              <th className="px-4 py-2 font-medium">Due date</th>
              <th className="px-4 py-2 font-medium">Outstanding</th>
              <th className="px-4 py-2 font-medium">Ageing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.number}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.party}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoiceDate}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.dueDate}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.outstandingAmount.toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      r.bucket === "Not yet due"
                        ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                        : r.bucket === "0-15 days" || r.bucket === "16-30 days"
                          ? "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400"
                          : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {r.bucket}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  Nothing outstanding.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
