import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { CreditNoteForm } from "../credit-note-form";

export default async function NewCreditNotePage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) redirect("/unauthorized");

  const { invoiceId } = await searchParams;
  const supabase = await createClient();

  if (!invoiceId) {
    const { data: invoices } = await supabase
      .from("sales_invoices")
      .select("id, invoice_number, invoice_date, customers(name)")
      .eq("status", "active")
      .not("customer_id", "is", null)
      .order("invoice_date", { ascending: false })
      .limit(200);

    return (
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Credit Note</h1>
          <HelpButton content={HELP_CONTENT["credit-notes"]} />
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pick the sales invoice this return is against. Only invoices billed to a known customer (not walk-in cash
          sales) can have a credit note.
        </p>
        <form className="mt-4 flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sales invoice</label>
            <select
              name="invoiceId"
              className="w-80 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Select invoice...</option>
              {(invoices ?? []).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} - {inv.customers?.name ?? ""} ({inv.invoice_date})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase
      .from("sales_invoices")
      .select("id, invoice_number, invoice_date, customers(name)")
      .eq("id", invoiceId)
      .single(),
    supabase
      .from("sales_invoice_items")
      .select("id, product_id, quantity, products(code, name)")
      .eq("invoice_id", invoiceId)
      .order("id"),
  ]);

  if (!invoice) redirect("/sales/returns/new");

  const itemIds = (items ?? []).map((i) => i.id);
  const [{ data: returnedRows }, { data: activeNotes }] = await Promise.all([
    itemIds.length > 0
      ? supabase.from("credit_note_items").select("sales_invoice_item_id, quantity, credit_note_id").in("sales_invoice_item_id", itemIds)
      : Promise.resolve({ data: [] as { sales_invoice_item_id: string; quantity: number; credit_note_id: string }[] }),
    supabase.from("credit_notes").select("id").eq("sales_invoice_id", invoiceId).eq("status", "active"),
  ]);

  const activeNoteIds = new Set((activeNotes ?? []).map((n) => n.id));
  const returnedMap = new Map<string, number>();
  for (const r of returnedRows ?? []) {
    if (activeNoteIds.has(r.credit_note_id)) {
      returnedMap.set(r.sales_invoice_item_id, (returnedMap.get(r.sales_invoice_item_id) ?? 0) + Number(r.quantity));
    }
  }

  const lineItems = (items ?? []).map((i) => ({
    id: i.id,
    productLabel: `${i.products?.code} - ${i.products?.name}`,
    originalQty: Number(i.quantity),
    alreadyReturned: returnedMap.get(i.id) ?? 0,
    remaining: Number(i.quantity) - (returnedMap.get(i.id) ?? 0),
  }));

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Credit Note</h1>
        <HelpButton content={HELP_CONTENT["credit-notes"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Against {invoice.invoice_number} - {invoice.customers?.name} ({invoice.invoice_date}).{" "}
        <Link href="/sales/returns/new" className="text-blue-600 dark:text-blue-400 hover:underline">
          Pick a different invoice
        </Link>
      </p>
      <CreditNoteForm salesInvoiceId={invoice.id} items={lineItems} />
    </div>
  );
}
