import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ExportCsvButton } from "@/components/export-csv-button";

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

type Row = {
  invoice_id: string;
  our_reference_number: string;
  supplier_invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  supplier_gstin: string | null;
  taxable_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  total_amount: number;
};

export default async function PurchaseRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "gst", "view")) redirect("/unauthorized");

  const { from, to } = await searchParams;
  const fromDate = from || firstOfMonthISO();
  const toDate = to || todayISO();
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_purchase_register", { p_from: fromDate, p_to: toDate });
  const rows = (data ?? []) as Row[];
  const totalInputTax = rows.reduce((s, r) => s + Number(r.cgst_total) + Number(r.sgst_total) + Number(r.igst_total), 0);
  const total = rows.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Purchase Register</h1>
        <HelpButton content={HELP_CONTENT["purchase-register"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every purchase in the period with its GST breakup - this is your input tax credit for the period.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromDate}
            max={todayISO()}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toDate}
            max={todayISO()}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Apply
        </button>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total purchases</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rs.{total.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total input tax credit</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rs.{totalInputTax.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <ExportCsvButton
          filename={`purchase-register-${fromDate}-to-${toDate}.csv`}
          headers={["Our Ref #", "Supplier Invoice #", "Date", "Supplier", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"]}
          rows={rows.map((r) => [
            r.our_reference_number, r.supplier_invoice_number, r.invoice_date, r.supplier_name, r.supplier_gstin ?? "",
            r.taxable_total, r.cgst_total, r.sgst_total, r.igst_total, r.total_amount,
          ])}
        />
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Our Ref #</th>
              <th className="px-4 py-2 font-medium">Supplier Invoice #</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Supplier</th>
              <th className="px-4 py-2 font-medium">GSTIN</th>
              <th className="px-4 py-2 font-medium">Taxable</th>
              <th className="px-4 py-2 font-medium">CGST</th>
              <th className="px-4 py-2 font-medium">SGST</th>
              <th className="px-4 py-2 font-medium">IGST</th>
              <th className="px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.invoice_id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.our_reference_number}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.supplier_invoice_number}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_date}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.supplier_name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.supplier_gstin ?? "-"}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.taxable_total).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.cgst_total).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.sgst_total).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.igst_total).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_amount).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No purchases in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
