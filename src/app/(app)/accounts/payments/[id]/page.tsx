import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ConfirmButton } from "@/components/confirm-button";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { cancelPayment } from "../actions";
import { PrintShareActions } from "@/components/print-share-actions";
import { DocumentLetterhead } from "@/components/document-letterhead";

const PURPOSE_LABELS: Record<string, string> = {
  supplier: "Supplier bill payment",
  on_account: "On account",
  expense: "Expense",
};

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: payment }, { data: allocations }, { data: company }] = await Promise.all([
    supabase.from("payments").select("*, suppliers(name, phone), expense_categories(name)").eq("id", id).single(),
    supabase
      .from("payment_allocations")
      .select("amount_allocated, purchase_invoices(our_reference_number, total_amount)")
      .eq("payment_id", id),
    supabase.from("company_settings").select("name, address, gstin, phone, logo_url").limit(1).single(),
  ]);

  if (!payment) notFound();

  const payeeLabel = payment.suppliers?.name ?? payment.expense_categories?.name ?? payment.paid_to ?? "recipient";
  const shareText = `Payment ${payment.payment_number} to ${payeeLabel} - Rs.${Number(payment.amount).toFixed(2)}.`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{payment.payment_number}</h1>
            <span className="no-print">
              <HelpButton content={HELP_CONTENT["payments"]} />
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {payment.method === "cash" ? "Cash Payment" : "Bank Payment"} - {payment.payment_date}
          </p>
        </div>
        {payment.status === "active" && can(user, "accounts", "delete") && (
          <ConfirmButton
            id={payment.id}
            label="Cancel payment"
            confirmTitle="Cancel this payment?"
            confirmBody="The supplier's outstanding balance will be restored."
            confirmLabel="Cancel payment"
            action={cancelPayment}
          />
        )}
        {payment.status === "cancelled" && (
          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Cancelled
          </span>
        )}
      </div>

      <div className="mt-4">
        <PrintShareActions backHref={`/accounts/payments/${payment.method}`} shareText={shareText} phone={payment.suppliers?.phone} />
      </div>

      <DocumentLetterhead company={company} />

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Purpose</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{PURPOSE_LABELS[payment.purpose]}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">To</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {payment.suppliers?.name ?? payment.expense_categories?.name ?? payment.paid_to ?? "-"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Amount</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{Number(payment.amount).toFixed(2)}</p>
        </div>
        {payment.reference_number && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">Reference number</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{payment.reference_number}</p>
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
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {a.purchase_invoices?.our_reference_number}
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {Number(a.purchase_invoices?.total_amount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(a.amount_allocated).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payment.notes && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
          {payment.notes}
        </p>
      )}
    </div>
  );
}
