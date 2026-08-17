import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { CancelInvoiceButton } from "../cancel-invoice-button";

const PROFIT_VISIBLE_ROLES = ["Admin", "Accountant", "Management"];

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: invoice }, { data: items }] = await Promise.all([
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
  ]);

  if (!invoice) notFound();

  const canSeeProfit = user ? PROFIT_VISIBLE_ROLES.includes(user.roleName) : false;
  const customerLabel = invoice.customers?.name ?? invoice.cash_customer_name ?? "Walk-in";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h1>
          <p className="text-sm text-gray-500">
            {invoice.sale_type === "credit" ? "Credit Sale" : "Cash Sale"} - {invoice.invoice_date}
          </p>
        </div>
        {invoice.status === "active" && can(user, "sales", "delete") && (
          <CancelInvoiceButton invoiceId={invoice.id} />
        )}
        {invoice.status === "cancelled" && (
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">Cancelled</span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 bg-white p-6 text-sm">
        <div>
          <p className="text-gray-500">Customer</p>
          <p className="font-medium text-gray-900">{customerLabel}</p>
        </div>
        <div>
          <p className="text-gray-500">Route</p>
          <p className="font-medium text-gray-900">{invoice.routes?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-gray-500">Sales staff</p>
          <p className="font-medium text-gray-900">{invoice.user_profiles?.full_name ?? "-"}</p>
        </div>
        {invoice.sale_type === "credit" && (
          <div>
            <p className="text-gray-500">Due date</p>
            <p className="font-medium text-gray-900">{invoice.due_date ?? "-"}</p>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">Disc %</th>
              <th className="px-4 py-2 font-medium">Taxable</th>
              <th className="px-4 py-2 font-medium">GST</th>
              <th className="px-4 py-2 font-medium">Total</th>
              {canSeeProfit && <th className="px-4 py-2 font-medium">Profit</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-gray-900">
                  {item.products?.code} - {item.products?.name}
                </td>
                <td className="px-4 py-2 text-gray-500">{item.quantity}</td>
                <td className="px-4 py-2 text-gray-500">{Number(item.rate).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500">{item.discount_percent}</td>
                <td className="px-4 py-2 text-gray-500">{Number(item.taxable_value).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500">
                  {(Number(item.cgst) + Number(item.sgst) + Number(item.igst)).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-gray-900">{Number(item.line_total).toFixed(2)}</td>
                {canSeeProfit && (
                  <td className="px-4 py-2 text-gray-500">{Number(item.profit_amount).toFixed(2)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-72 rounded-md bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Discount</span>
            <span>{Number(invoice.discount_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Taxable</span>
            <span>{Number(invoice.taxable_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">CGST</span>
            <span>{Number(invoice.cgst_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">SGST</span>
            <span>{Number(invoice.sgst_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">IGST</span>
            <span>{Number(invoice.igst_total).toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold">
            <span>Total</span>
            <span>{Number(invoice.total_amount).toFixed(2)}</span>
          </div>
          {canSeeProfit && (
            <div className="mt-1 flex justify-between border-t border-gray-200 pt-1">
              <span className="text-gray-500">Profit</span>
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
        <p className="mt-4 text-sm text-gray-500">
          <span className="font-medium text-gray-700">Notes: </span>
          {invoice.notes}
        </p>
      )}
    </div>
  );
}
