import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelPurchaseInvoice } from "../actions";
import { VerificationPanel } from "../verification-panel";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "purchase", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: invoice }, { data: items }, { data: verification }] = await Promise.all([
    supabase
      .from("purchase_invoices")
      .select("*, suppliers(name, phone)")
      .eq("id", id)
      .single(),
    supabase
      .from("purchase_invoice_items")
      .select("*, products(code, name)")
      .eq("invoice_id", id)
      .order("id"),
    supabase.from("purchase_verifications").select("*").eq("purchase_invoice_id", id).maybeSingle(),
  ]);

  if (!invoice) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.our_reference_number}</h1>
            <HelpButton content={HELP_CONTENT["purchase-entries"]} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supplier invoice {invoice.supplier_invoice_number} - {invoice.supplier_invoice_date}
          </p>
        </div>
        {invoice.status === "active" && can(user, "purchase", "delete") && (
          <ConfirmButton
            id={invoice.id}
            label="Cancel purchase"
            confirmTitle="Cancel this purchase?"
            confirmBody="Stock quantities will be reversed and the purchase will be marked cancelled."
            confirmLabel="Cancel purchase"
            action={cancelPurchaseInvoice}
          />
        )}
        {invoice.status === "cancelled" && (
          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Cancelled
          </span>
        )}
      </div>

      {invoice.duplicate_override && (
        <p className="mt-2 rounded-md bg-yellow-50 dark:bg-yellow-950/40 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-400">
          This invoice was flagged as a possible duplicate supplier invoice number and was created via an
          authorized override.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Supplier</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.suppliers?.name ?? "-"}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Rate</th>
                  <th className="px-4 py-2 font-medium">Taxable</th>
                  <th className="px-4 py-2 font-medium">GST</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {item.products?.code} - {item.products?.name}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                      {Number(item.taxable_value).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                      {(Number(item.cgst) + Number(item.sgst) + Number(item.igst)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {Number(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-72 rounded-md bg-gray-50 dark:bg-gray-950 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Taxable</span>
                <span>{Number(invoice.taxable_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">CGST</span>
                <span>{Number(invoice.cgst_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">SGST</span>
                <span>{Number(invoice.sgst_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">IGST</span>
                <span>{Number(invoice.igst_total).toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-1 font-semibold">
                <span>Total</span>
                <span>{Number(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
              {invoice.notes}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <VerificationPanel
            invoiceId={invoice.id}
            verification={verification}
            erpTaxable={Number(invoice.taxable_total)}
            erpGst={Number(invoice.cgst_total) + Number(invoice.sgst_total) + Number(invoice.igst_total)}
            erpTotal={Number(invoice.total_amount)}
            canEdit={can(user, "purchase", "edit")}
          />
        </div>
      </div>
    </div>
  );
}
