import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelSalesInvoice } from "../actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { PrintShareActions } from "@/components/print-share-actions";
import { DocumentLetterhead } from "@/components/document-letterhead";

const PROFIT_VISIBLE_ROLES = ["Admin", "Accountant", "Management"];

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: invoice }, { data: items }, { data: company }] = await Promise.all([
    supabase
      .from("sales_invoices")
      .select("*, customers(name, phone), routes(name), user_profiles(full_name)")
      .eq("id", id)
      .single(),
    supabase
      .from("sales_invoice_items")
      .select("*, products(code, name)")
      .eq("invoice_id", id)
      .order("id"),
    supabase.from("company_settings").select("name, address, gstin, phone, logo_url").limit(1).single(),
  ]);

  if (!invoice) notFound();

  const canSeeProfit = user ? PROFIT_VISIBLE_ROLES.includes(user.roleName) : false;
  const customerLabel = invoice.customers?.name ?? invoice.cash_customer_name ?? "Walk-in";
  const customerPhone = invoice.customers?.phone ?? invoice.cash_customer_phone;
  const shareText = `Invoice ${invoice.invoice_number} for ${customerLabel} - Rs.${Number(invoice.total_amount).toFixed(2)}. Thank you for your business!`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.invoice_number}</h1>
            <span className="no-print">
              <HelpButton content={HELP_CONTENT["sales-invoice-detail"]} />
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {invoice.sale_type === "credit" ? "Credit Sale" : "Cash Sale"} - {invoice.invoice_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === "active" && can(user, "sales", "delete") && (
            <ConfirmButton
              id={invoice.id}
              label="Cancel invoice"
              confirmTitle="Cancel this invoice?"
              confirmBody="Stock quantities will be restored and the invoice will be marked cancelled."
              confirmLabel="Cancel invoice"
              action={cancelSalesInvoice}
            />
          )}
          {invoice.status === "cancelled" && (
            <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">Cancelled</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <PrintShareActions backHref={`/sales/${invoice.sale_type}`} shareText={shareText} phone={customerPhone} />
      </div>

      <DocumentLetterhead company={company} />

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Customer</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{customerLabel}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Route</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.routes?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Sales staff</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.user_profiles?.full_name ?? "-"}</p>
        </div>
        {invoice.sale_type === "credit" && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">Due date</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.due_date ?? "-"}</p>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">Disc %</th>
              <th className="px-4 py-2 font-medium">Taxable</th>
              <th className="px-4 py-2 font-medium">GST</th>
              <th className="px-4 py-2 font-medium">Total</th>
              {canSeeProfit && <th className="no-print px-4 py-2 font-medium">Profit</th>}
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
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{item.discount_percent}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(item.taxable_value).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {(Number(item.cgst) + Number(item.sgst) + Number(item.igst)).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(item.line_total).toFixed(2)}</td>
                {canSeeProfit && (
                  <td className="no-print px-4 py-2 text-gray-500 dark:text-gray-400">{Number(item.profit_amount).toFixed(2)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-72 rounded-md bg-gray-50 dark:bg-gray-950 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span>{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Discount</span>
            <span>{Number(invoice.discount_total).toFixed(2)}</span>
          </div>
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
          {canSeeProfit && (
            <div className="no-print mt-1 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-1">
              <span className="text-gray-500 dark:text-gray-400">Profit</span>
              <span>
                {Number(invoice.profit_total).toFixed(2)} (
                {invoice.cost_total > 0
                  ? ((Number(invoice.profit_total) / Number(invoice.cost_total)) * 100).toFixed(1)
                  : "0"}
                %)
              </span>
            </div>
          )}
        </div>
      </div>

      {invoice.notes && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
          {invoice.notes}
        </p>
      )}
    </div>
  );
}
