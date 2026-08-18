import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelCreditNote } from "../actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: note }, { data: items }] = await Promise.all([
    supabase
      .from("credit_notes")
      .select("*, customers(name), sales_invoices(invoice_number)")
      .eq("id", id)
      .single(),
    supabase.from("credit_note_items").select("*, products(code, name)").eq("credit_note_id", id).order("id"),
  ]);

  if (!note) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{note.credit_note_number}</h1>
            <HelpButton content={HELP_CONTENT["credit-notes"]} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Against {note.sales_invoices?.invoice_number} - {note.credit_note_date}
          </p>
        </div>
        {note.status === "active" && can(user, "sales", "delete") && (
          <ConfirmButton
            id={note.id}
            label="Cancel credit note"
            confirmTitle="Cancel this credit note?"
            confirmBody="Stock and the customer's balance will be reversed."
            confirmLabel="Cancel credit note"
            action={cancelCreditNote}
          />
        )}
        {note.status === "cancelled" && (
          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Cancelled
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Customer</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{note.customers?.name}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Reason</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{note.reason}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
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
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(item.taxable_value).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {(Number(item.cgst) + Number(item.sgst) + Number(item.igst)).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-72 rounded-md bg-gray-50 dark:bg-gray-950 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Taxable</span>
            <span>{Number(note.taxable_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">CGST</span>
            <span>{Number(note.cgst_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">SGST</span>
            <span>{Number(note.sgst_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">IGST</span>
            <span>{Number(note.igst_total).toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-1 font-semibold">
            <span>Total</span>
            <span>{Number(note.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
