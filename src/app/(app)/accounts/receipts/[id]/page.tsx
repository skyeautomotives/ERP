import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { CancelInvoiceButton } from "@/components/cancel-invoice-button";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { cancelReceipt } from "../actions";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: receipt }, { data: allocations }] = await Promise.all([
    supabase.from("receipts").select("*, customers(name, phone)").eq("id", id).single(),
    supabase
      .from("receipt_allocations")
      .select("amount_allocated, sales_invoices(invoice_number, total_amount)")
      .eq("receipt_id", id),
  ]);

  if (!receipt) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{receipt.receipt_number}</h1>
            <HelpButton content={HELP_CONTENT["receipts"]} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {receipt.method === "cash" ? "Cash Receipt" : "Bank Receipt"} - {receipt.receipt_date}
          </p>
        </div>
        {receipt.status === "active" && can(user, "accounts", "delete") && (
          <CancelInvoiceButton invoiceId={receipt.id} action={cancelReceipt} label="Cancel receipt" />
        )}
        {receipt.status === "cancelled" && (
          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Cancelled
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Customer</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{receipt.customers?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Mode</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {receipt.mode === "bill" ? "Against bill" : "On account"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Amount</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{Number(receipt.amount).toFixed(2)}</p>
        </div>
        {receipt.reference_number && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">Reference number</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{receipt.reference_number}</p>
          </div>
        )}
      </div>

      {allocations && allocations.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">Invoice total</th>
                <th className="px-4 py-2 font-medium">Allocated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {allocations.map((a, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{a.sales_invoices?.invoice_number}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {Number(a.sales_invoices?.total_amount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(a.amount_allocated).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt.notes && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
          {receipt.notes}
        </p>
      )}
    </div>
  );
}
