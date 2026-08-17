import Link from "next/link";
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

type HsnRow = {
  hsn_code: string;
  description: string;
  unit: string | null;
  gst_percent: number;
  total_quantity: number;
  taxable_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  total_amount: number;
};

export default async function HsnSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "gst", "view")) redirect("/unauthorized");

  const { from, to, type } = await searchParams;
  const fromDate = from || firstOfMonthISO();
  const toDate = to || todayISO();
  const activeType = type === "purchase" ? "purchase" : "sales";
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_hsn_summary", { p_from: fromDate, p_to: toDate, p_type: activeType });
  const rows = (data ?? []) as HsnRow[];
  const total = rows.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">HSN Summary</h1>
        <HelpButton content={HELP_CONTENT["hsn-summary"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Sales or purchases grouped by HSN code and GST rate for the period.
      </p>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/gst/hsn-summary?type=sales&from=${fromDate}&to=${toDate}`}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            activeType === "sales"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Sales
        </Link>
        <Link
          href={`/gst/hsn-summary?type=purchase&from=${fromDate}&to=${toDate}`}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            activeType === "purchase"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Purchases
        </Link>
      </div>

      <form className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="type" value={activeType} />
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

      <div className="mt-4 flex justify-end">
        <ExportCsvButton
          filename={`hsn-summary-${activeType}-${fromDate}-to-${toDate}.csv`}
          headers={["HSN", "Description", "Unit", "GST %", "Qty", "Taxable", "CGST", "SGST", "IGST", "Total"]}
          rows={rows.map((r) => [
            r.hsn_code, r.description, r.unit ?? "", r.gst_percent, r.total_quantity,
            r.taxable_total, r.cgst_total, r.sgst_total, r.igst_total, r.total_amount,
          ])}
        />
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">HSN</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Unit</th>
              <th className="px-4 py-2 font-medium">GST %</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Taxable</th>
              <th className="px-4 py-2 font-medium">CGST</th>
              <th className="px-4 py-2 font-medium">SGST</th>
              <th className="px-4 py-2 font-medium">IGST</th>
              <th className="px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r, i) => (
              <tr key={`${r.hsn_code}-${r.gst_percent}-${i}`}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.hsn_code}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.description}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.unit ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.gst_percent}%</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.total_quantity}</td>
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
                  Nothing in this period.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
              <tr>
                <td colSpan={9} className="px-4 py-2 text-right">Total</td>
                <td className="px-4 py-2">{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
