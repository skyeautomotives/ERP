import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

type B2BRow = { cgst_total: number; sgst_total: number; igst_total: number };
type B2CRow = { cgst_total: number; sgst_total: number; igst_total: number };
type PurchaseRow = { cgst_total: number; sgst_total: number; igst_total: number };
type BalanceRow = { code: string; total_debit: number; total_credit: number };

function ReconRow({ label, left, right }: { label: string; left: number; right: number }) {
  const matched = Math.abs(left - right) < 0.01;
  return (
    <tr>
      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{label}</td>
      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{left.toFixed(2)}</td>
      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{right.toFixed(2)}</td>
      <td className="px-4 py-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            matched
              ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"
          }`}
        >
          {matched ? "Matched" : "Mismatch"}
        </span>
      </td>
    </tr>
  );
}

export default async function GstReconciliationPage({
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

  const [{ data: b2b }, { data: b2c }, { data: purchaseReg }, { data: balances }, { data: creditNotes }, { data: debitNotes }] =
    await Promise.all([
      supabase.rpc("get_gstr1_b2b", { p_from: fromDate, p_to: toDate }),
      supabase.rpc("get_gstr1_b2c_summary", { p_from: fromDate, p_to: toDate }),
      supabase.rpc("get_purchase_register", { p_from: fromDate, p_to: toDate }),
      supabase.rpc("get_account_balances", { p_from_date: fromDate, p_to_date: toDate }),
      supabase
        .from("credit_notes")
        .select("cgst_total, sgst_total, igst_total")
        .eq("status", "active")
        .gte("credit_note_date", fromDate)
        .lte("credit_note_date", toDate),
      supabase
        .from("debit_notes")
        .select("cgst_total, sgst_total, igst_total")
        .eq("status", "active")
        .gte("debit_note_date", fromDate)
        .lte("debit_note_date", toDate),
    ]);

  const sumTax = (rows: { cgst_total: number; sgst_total: number; igst_total: number }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.cgst_total) + Number(r.sgst_total) + Number(r.igst_total), 0);

  const outputTaxGross = sumTax((b2b ?? []) as B2BRow[]) + sumTax((b2c ?? []) as B2CRow[]);
  const creditNoteTax = sumTax(creditNotes as { cgst_total: number; sgst_total: number; igst_total: number }[] | null);
  const outputTaxNet = outputTaxGross - creditNoteTax;

  const inputTaxGross = sumTax((purchaseReg ?? []) as PurchaseRow[]);
  const debitNoteTax = sumTax(debitNotes as { cgst_total: number; sgst_total: number; igst_total: number }[] | null);
  const inputTaxNet = inputTaxGross - debitNoteTax;

  const balanceRows = (balances ?? []) as BalanceRow[];
  const gstPayable = balanceRows.find((b) => b.code === "2100");
  const gstPayableNet = gstPayable ? Number(gstPayable.total_credit) - Number(gstPayable.total_debit) : 0;

  const gstInputCredit = balanceRows.find((b) => b.code === "1300");
  const gstInputCreditNet = gstInputCredit ? Number(gstInputCredit.total_debit) - Number(gstInputCredit.total_credit) : 0;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GST Reconciliation</h1>
        <HelpButton content={HELP_CONTENT["gst-reconciliation"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Cross-checks the GSTR-1/Purchase Register figures against the GST Payable and GST Input Credit ledger
        accounts for the same period - they should always match, since the same transactions feed both.
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

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Check</th>
              <th className="px-4 py-2 font-medium">GST reports (net of returns)</th>
              <th className="px-4 py-2 font-medium">Ledger account</th>
              <th className="px-4 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            <ReconRow label="Output GST (GSTR-1 less credit notes) vs GST Payable" left={outputTaxNet} right={gstPayableNet} />
            <ReconRow label="Input GST (Purchase Register less debit notes) vs GST Input Credit" left={inputTaxNet} right={gstInputCreditNet} />
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
          <p className="text-gray-500 dark:text-gray-400">GSTR-1 output tax, gross</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{outputTaxGross.toFixed(2)}</p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Less credit notes this period</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{creditNoteTax.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
          <p className="text-gray-500 dark:text-gray-400">Purchase Register input tax, gross</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{inputTaxGross.toFixed(2)}</p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Less debit notes this period</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{debitNoteTax.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
