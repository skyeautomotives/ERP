import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelSalesInvoice } from "../actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { PrintShareActions } from "@/components/print-share-actions";
import { TaxInvoiceHeader } from "@/components/tax-invoice-header";
import { TaxInvoiceFooter } from "@/components/tax-invoice-footer";
import { amountInWords } from "@/lib/number-to-words";

const PROFIT_VISIBLE_ROLES = ["Admin", "Accountant", "Management"];

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: invoice }, { data: items }, { data: company }] = await Promise.all([
    supabase
      .from("sales_invoices")
      .select("*, customers(name, phone, address, state, gstin), routes(name), user_profiles(full_name)")
      .eq("id", id)
      .single(),
    supabase
      .from("sales_invoice_items")
      .select("*, products(code, name, hsn_code, unit)")
      .eq("invoice_id", id)
      .order("id"),
    supabase
      .from("company_settings")
      .select("name, address, gstin, phone, state, logo_url, bank_name, bank_account_number, bank_ifsc, invoice_terms")
      .limit(1)
      .single(),
  ]);

  if (!invoice) notFound();

  const canSeeProfit = user ? PROFIT_VISIBLE_ROLES.includes(user.roleName) : false;
  const customerLabel = invoice.customers?.name ?? invoice.cash_customer_name ?? "Walk-in";
  const customerPhone = invoice.customers?.phone ?? invoice.cash_customer_phone;
  const shareText = `Invoice ${invoice.invoice_number} for ${customerLabel} - Rs.${Number(invoice.total_amount).toFixed(2)}. Thank you for your business!`;
  const isInterstate = Number(invoice.igst_total) > 0;

  const gstBreakdown = Object.values(
    (items ?? []).reduce<Record<string, { rate: number; taxable: number; tax: number }>>((acc, item) => {
      const rate = Number(item.gst_percent);
      const key = String(rate);
      if (!acc[key]) acc[key] = { rate, taxable: 0, tax: 0 };
      acc[key].taxable += Number(item.taxable_value);
      acc[key].tax += Number(item.cgst) + Number(item.sgst) + Number(item.igst);
      return acc;
    }, {}),
  ).sort((a, b) => a.rate - b.rate);

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
        <div className="no-print flex items-center gap-2">
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

      {/* Internal-only info not part of the printed document */}
      <div className="no-print mt-4 flex gap-6 text-sm text-gray-500 dark:text-gray-400">
        <span>
          Route: <span className="font-medium text-gray-900 dark:text-gray-100">{invoice.routes?.name ?? "-"}</span>
        </span>
        {invoice.sale_type === "credit" && (
          <span>
            Due date: <span className="font-medium text-gray-900 dark:text-gray-100">{invoice.due_date ?? "-"}</span>
          </span>
        )}
      </div>

      <div className="mt-4">
        <TaxInvoiceHeader
          company={company}
          docLabel="Tax Invoice"
          docNumber={invoice.invoice_number}
          docDate={formatDate(invoice.invoice_date)}
          party={{
            name: customerLabel,
            address: invoice.customers?.address ?? null,
            phone: customerPhone ?? null,
            state: invoice.customers?.state ?? null,
            gstin: invoice.customers?.gstin ?? null,
          }}
          staffName={invoice.user_profiles?.full_name}
          remarks={invoice.notes}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-300 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-300 bg-gray-50 uppercase text-gray-600">
            <tr>
              <th className="px-2 py-2 font-medium">SI</th>
              <th className="px-2 py-2 font-medium">Description of Goods</th>
              <th className="px-2 py-2 font-medium">HSN</th>
              <th className="px-2 py-2 font-medium">Qty</th>
              <th className="px-2 py-2 font-medium">Price</th>
              <th className="px-2 py-2 font-medium">Disc Amt</th>
              <th className="px-2 py-2 font-medium">Net Value</th>
              {isInterstate ? (
                <th className="px-2 py-2 font-medium">IGST</th>
              ) : (
                <>
                  <th className="px-2 py-2 font-medium">CGST</th>
                  <th className="px-2 py-2 font-medium">SGST</th>
                </>
              )}
              <th className="px-2 py-2 font-medium">Total</th>
              {canSeeProfit && <th className="no-print px-2 py-2 font-medium">Profit</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-900">
            {(items ?? []).map((item, i) => {
              const discAmt = Number(item.quantity) * Number(item.rate) - Number(item.taxable_value);
              return (
                <tr key={item.id}>
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2">
                    {item.products?.code} - {item.products?.name}
                  </td>
                  <td className="px-2 py-2">{item.products?.hsn_code ?? "-"}</td>
                  <td className="px-2 py-2">
                    {item.quantity} {item.products?.unit ?? ""}
                  </td>
                  <td className="px-2 py-2">{Number(item.rate).toFixed(2)}</td>
                  <td className="px-2 py-2">{discAmt.toFixed(2)}</td>
                  <td className="px-2 py-2">{Number(item.taxable_value).toFixed(2)}</td>
                  {isInterstate ? (
                    <td className="px-2 py-2">
                      {Number(item.gst_percent).toFixed(0)}% / {Number(item.igst).toFixed(2)}
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-2">
                        {(Number(item.gst_percent) / 2).toFixed(1)}% / {Number(item.cgst).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        {(Number(item.gst_percent) / 2).toFixed(1)}% / {Number(item.sgst).toFixed(2)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-2 font-medium">{Number(item.line_total).toFixed(2)}</td>
                  {canSeeProfit && (
                    <td className="no-print px-2 py-2 text-gray-500">{Number(item.profit_amount).toFixed(2)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-gray-300 font-semibold text-gray-900">
            <tr>
              <td colSpan={6} className="px-2 py-2 text-right">
                Total
              </td>
              <td className="px-2 py-2">{Number(invoice.taxable_total).toFixed(2)}</td>
              <td className="px-2 py-2" colSpan={isInterstate ? 1 : 2}>
                {(Number(invoice.cgst_total) + Number(invoice.sgst_total) + Number(invoice.igst_total)).toFixed(2)}
              </td>
              <td className="px-2 py-2">{Number(invoice.total_amount).toFixed(2)}</td>
              {canSeeProfit && <td className="no-print px-2 py-2">{Number(invoice.profit_total).toFixed(2)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {canSeeProfit && (
        <p className="no-print mt-2 text-sm text-gray-500 dark:text-gray-400">
          Profit: {Number(invoice.profit_total).toFixed(2)} (
          {invoice.cost_total > 0 ? ((Number(invoice.profit_total) / Number(invoice.cost_total)) * 100).toFixed(1) : "0"}
          %)
        </p>
      )}

      <TaxInvoiceFooter
        company={company}
        amountWords={amountInWords(Number(invoice.total_amount))}
        gstBreakdown={gstBreakdown}
        totalAmount={Number(invoice.total_amount)}
      />
    </div>
  );
}
