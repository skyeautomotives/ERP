"use client";

import { useState, useTransition } from "react";
import { createCreditNote } from "./actions";

type LineItem = {
  id: string;
  productLabel: string;
  originalQty: number;
  alreadyReturned: number;
  remaining: number;
};

export function CreditNoteForm({ salesInvoiceId, items }: { salesInvoiceId: string; items: LineItem[] }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) return setError("Enter a reason for the return.");

    for (const [id, v] of Object.entries(quantities)) {
      const line = items.find((i) => i.id === id);
      if (line && Number(v) > line.remaining) {
        return setError(`Cannot return more than ${line.remaining} of ${line.productLabel}.`);
      }
    }

    const returnItems = Object.entries(quantities)
      .filter(([, v]) => Number(v) > 0)
      .map(([id, v]) => ({ sales_invoice_item_id: id, quantity: Number(v) }));

    if (returnItems.length === 0) return setError("Enter a quantity to return for at least one item.");

    startTransition(async () => {
      const result = await createCreditNote({ sales_invoice_id: salesInvoiceId, reason, items: returnItems });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Original qty</th>
              <th className="px-3 py-2 font-medium">Already returned</th>
              <th className="px-3 py-2 font-medium">Remaining</th>
              <th className="px-3 py-2 font-medium">Return qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{i.productLabel}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.originalQty}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.alreadyReturned}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.remaining}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max={i.remaining}
                    disabled={i.remaining <= 0}
                    value={quantities[i.id] ?? ""}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [i.id]: e.target.value }))}
                    className="w-24 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500">
                  This invoice has no line items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create credit note"}
      </button>
    </form>
  );
}
