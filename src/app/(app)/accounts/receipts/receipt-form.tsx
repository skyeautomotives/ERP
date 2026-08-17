"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createReceipt } from "./actions";

type Option = { id: string; label: string };
type OutstandingInvoice = {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  outstanding_amount: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function ReceiptForm({ method, customers }: { method: "cash" | "bank"; customers: Option[] }) {
  const [customerId, setCustomerId] = useState("");
  const [mode, setMode] = useState<"bill" | "on_account">("bill");
  const [amount, setAmount] = useState("");
  const [receiptDate, setReceiptDate] = useState(todayISO());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!customerId || mode !== "bill") {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("sales_invoice_outstanding")
      .select("invoice_id, invoice_number, total_amount, outstanding_amount")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .gt("outstanding_amount", 0)
      .order("invoice_number")
      .then(({ data }) => {
        if (!cancelled) setInvoices((data ?? []) as OutstandingInvoice[]);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, mode]);

  const allocatedTotal = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [allocations],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) return setError("Select a customer.");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a positive amount.");

    let allocationList: { sales_invoice_id: string; amount_allocated: number }[] = [];
    if (mode === "bill") {
      allocationList = Object.entries(allocations)
        .filter(([, v]) => Number(v) > 0)
        .map(([invoiceId, v]) => ({ sales_invoice_id: invoiceId, amount_allocated: Number(v) }));
      if (allocationList.length === 0) return setError("Allocate the amount to at least one invoice.");
      if (Math.abs(allocatedTotal - amt) > 0.01) {
        return setError(`Allocated total (${allocatedTotal.toFixed(2)}) must equal the receipt amount (${amt.toFixed(2)}).`);
      }
    }

    startTransition(async () => {
      const result = await createReceipt({
        method,
        customer_id: customerId,
        mode,
        amount: amt,
        receipt_date: receiptDate,
        reference_number: method === "bank" ? referenceNumber || null : null,
        notes: notes || null,
        allocations: allocationList,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
          <select
            name="customer_id"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setAllocations({});
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
          <select
            name="mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as "bill" | "on_account");
              setAllocations({});
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            <option value="bill">Against bill(s)</option>
            <option value="on_account">On account</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        {method === "bank" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reference / UTR number
            </label>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
      </div>

      {mode === "bill" && customerId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Allocate to invoices
          </label>
          <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Invoice</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Outstanding</th>
                  <th className="px-3 py-2 font-medium">Allocate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoices.map((inv) => (
                  <tr key={inv.invoice_id}>
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{inv.invoice_number}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{Number(inv.total_amount).toFixed(2)}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{Number(inv.outstanding_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={inv.outstanding_amount}
                        value={allocations[inv.invoice_id] ?? ""}
                        onChange={(e) =>
                          setAllocations((prev) => ({ ...prev, [inv.invoice_id]: e.target.value }))
                        }
                        className="w-28 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      />
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500">
                      No outstanding invoices for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Allocated so far: Rs.{allocatedTotal.toFixed(2)}
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : `Record ${method === "cash" ? "cash" : "bank"} receipt`}
      </button>
    </form>
  );
}
