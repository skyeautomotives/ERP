import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ExportCsvButton } from "@/components/export-csv-button";
import { ModuleTabs } from "@/components/module-tabs";
import { GST_TABS } from "../gst-tabs";

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

type B2BRow = {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_gstin: string;
  taxable_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  total_amount: number;
};

type B2CRow = {
  gst_percent: number;
  invoice_count: number;
  taxable_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  total_amount: number;
};

export default async function Gstr1Page({
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

  const [{ data: b2b }, { data: b2c }] = await Promise.all([
    supabase.rpc("get_gstr1_b2b", { p_from: fromDate, p_to: toDate }),
    supabase.rpc("get_gstr1_b2c_summary", { p_from: fromDate, p_to: toDate }),
  ]);
  const b2bRows = (b2b ?? []) as B2BRow[];
  const b2cRows = (b2c ?? []) as B2CRow[];

  const b2bTotal = b2bRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const b2cTotal = b2cRows.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div>
      <ModuleTabs tabs={GST_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GSTR-1</h1>
        <HelpButton content={HELP_CONTENT["gstr1"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Outward supplies for the period - B2B (customer has a GSTIN) invoice-wise, B2C summarized by rate.
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

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">B2B - invoice-wise</p>
          <ExportCsvButton
            filename={`gstr1-b2b-${fromDate}-to-${toDate}.csv`}
            headers={["Invoice #", "Date", "Customer", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"]}
            rows={b2bRows.map((r) => [
              r.invoice_number, r.invoice_date, r.customer_name, r.customer_gstin,
              r.taxable_total, r.cgst_total, r.sgst_total, r.igst_total, r.total_amount,
            ])}
          />
        </div>
        <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice #</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">GSTIN</th>
                <th className="px-4 py-2 font-medium">Taxable</th>
                <th className="px-4 py-2 font-medium">CGST</th>
                <th className="px-4 py-2 font-medium">SGST</th>
                <th className="px-4 py-2 font-medium">IGST</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {b2bRows.map((r) => (
                <tr key={r.invoice_id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.invoice_number}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_date}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.customer_name}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.customer_gstin}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.taxable_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.cgst_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.sgst_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.igst_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_amount).toFixed(2)}</td>
                </tr>
              ))}
              {b2bRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                    No B2B invoices in this period.
                  </td>
                </tr>
              )}
            </tbody>
            {b2bRows.length > 0 && (
              <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
                <tr>
                  <td colSpan={8} className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2">{b2bTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">B2C - summary by rate</p>
          <ExportCsvButton
            filename={`gstr1-b2c-${fromDate}-to-${toDate}.csv`}
            headers={["GST %", "Invoices", "Taxable", "CGST", "SGST", "IGST", "Total"]}
            rows={b2cRows.map((r) => [
              r.gst_percent, r.invoice_count, r.taxable_total, r.cgst_total, r.sgst_total, r.igst_total, r.total_amount,
            ])}
          />
        </div>
        <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">GST %</th>
                <th className="px-4 py-2 font-medium">Invoices</th>
                <th className="px-4 py-2 font-medium">Taxable</th>
                <th className="px-4 py-2 font-medium">CGST</th>
                <th className="px-4 py-2 font-medium">SGST</th>
                <th className="px-4 py-2 font-medium">IGST</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {b2cRows.map((r) => (
                <tr key={r.gst_percent}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.gst_percent}%</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_count}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.taxable_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.cgst_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.sgst_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.igst_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_amount).toFixed(2)}</td>
                </tr>
              ))}
              {b2cRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                    No B2C sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
            {b2cRows.length > 0 && (
              <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2">{b2cTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
