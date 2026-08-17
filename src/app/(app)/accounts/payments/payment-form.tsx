"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPayment } from "./actions";

type Option = { id: string; label: string };
type OutstandingInvoice = {
  invoice_id: string;
  our_reference_number: string;
  total_amount: number;
  outstanding_amount: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function PaymentForm({
  method,
  suppliers,
  expenseCategories,
}: {
  method: "cash" | "bank";
  suppliers: Option[];
  expenseCategories: Option[];
}) {
  const [purpose, setPurpose] = useState<"supplier" | "on_account" | "expense">("supplier");
  const [supplierId, setSupplierId] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!supplierId || purpose !== "supplier") {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("purchase_invoice_outstanding")
      .select("invoice_id, our_reference_number, total_amount, outstanding_amount")
      .eq("supplier_id", supplierId)
      .eq("status", "active")
      .gt("outstanding_amount", 0)
      .order("our_reference_number")
      .then(({ data }) => {
        if (!cancelled) setInvoices((data ?? []) as OutstandingInvoice[]);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, purpose]);

  const allocatedTotal = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [allocations],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a positive amount.");

    if ((purpose === "supplier" || purpose === "on_account") && !supplierId) {
      return setError("Select a supplier.");
    }
    if (purpose === "expense" && !expenseCategoryId) {
      return setError("Select an expense category.");
    }

    let allocationList: { purchase_invoice_id: string; amount_allocated: number }[] = [];
    if (purpose === "supplier") {
      allocationList = Object.entries(allocations)
        .filter(([, v]) => Number(v) > 0)
        .map(([invoiceId, v]) => ({ purchase_invoice_id: invoiceId, amount_allocated: Number(v) }));
      if (allocationList.length === 0) return setError("Allocate the amount to at least one invoice.");
      if (Math.abs(allocatedTotal - amt) > 0.01) {
        return setError(`Allocated total (${allocatedTotal.toFixed(2)}) must equal the payment amount (${amt.toFixed(2)}).`);
      }
    }

    startTransition(async () => {
      const result = await createPayment({
        method,
        purpose,
        supplier_id: purpose !== "expense" ? supplierId || null : null,
        expense_category_id: purpose === "expense" ? expenseCategoryId || null : null,
        paid_to: paidTo || null,
        amount: amt,
        payment_date: paymentDate,
        reference_number: method === "bank" ? referenceNumber || null : null,
        notes: notes || null,
        allocations: allocationList,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</label>
        <select
          name="purpose"
          value={purpose}
          onChange={(e) => {
            setPurpose(e.target.value as typeof purpose);
            setAllocations({});
          }}
          className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
        >
          <option value="supplier">Supplier bill payment</option>
          <option value="on_account">On account (advance to supplier)</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(purpose === "supplier" || purpose === "on_account") && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
            <select
              name="supplier_id"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setAllocations({});
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {purpose === "expense" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Expense category
            </label>
            <select
              name="expense_category_id"
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            >
              <option value="">Select category...</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Paid to</label>
          <input
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
            autoComplete="off"
            placeholder="Optional - who physically received it"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
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
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
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

      {purpose === "supplier" && supplierId && (
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
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{inv.our_reference_number}</td>
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
                      No outstanding invoices for this supplier.
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
        {pending ? "Saving..." : `Record ${method === "cash" ? "cash" : "bank"} payment`}
      </button>
    </form>
  );
}
