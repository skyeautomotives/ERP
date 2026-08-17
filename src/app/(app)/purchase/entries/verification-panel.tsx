"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPurchaseVerification } from "./actions";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending Verification",
    className: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  },
  matched: {
    label: "Matched",
    className: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  },
  partial: {
    label: "Partially Matched",
    className: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
  },
  mismatch: {
    label: "Mismatch",
    className: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  },
};

type Verification = {
  supplier_taxable_value: number | null;
  supplier_gst_total: number | null;
  supplier_total: number | null;
  status: string;
  notes: string | null;
} | null;

export function VerificationPanel({
  invoiceId,
  verification,
  erpTaxable,
  erpGst,
  erpTotal,
  canEdit,
}: {
  invoiceId: string;
  verification: Verification;
  erpTaxable: number;
  erpGst: number;
  erpTotal: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [taxable, setTaxable] = useState(verification?.supplier_taxable_value?.toString() ?? "");
  const [gst, setGst] = useState(verification?.supplier_gst_total?.toString() ?? "");
  const [total, setTotal] = useState(verification?.supplier_total?.toString() ?? "");
  const [notes, setNotes] = useState(verification?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const status = verification?.status ?? "pending";
  const style = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
  const diff = total ? Number(total) - erpTotal : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await recordPurchaseVerification(
        invoiceId,
        Number(taxable) || 0,
        Number(gst) || 0,
        Number(total) || 0,
        notes || null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bill Verification</h2>
        <span className={`rounded px-2 py-1 text-xs font-medium ${style.className}`}>{style.label}</span>
      </div>

      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Enter what the supplier&apos;s paper invoice says. This is compared against what was entered here
        (Taxable Rs.{erpTaxable.toFixed(2)}, GST Rs.{erpGst.toFixed(2)}, Total Rs.{erpTotal.toFixed(2)}).
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Supplier taxable value
          </label>
          <input
            name="supplier_taxable_value"
            type="number"
            step="0.01"
            value={taxable}
            onChange={(e) => setTaxable(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Supplier GST</label>
          <input
            name="supplier_gst_total"
            type="number"
            step="0.01"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Supplier invoice total
          </label>
          <input
            name="supplier_total"
            type="number"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            disabled={!canEdit}
          />
        </div>

        {diff !== null && diff !== 0 && (
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Difference: Rs.{Math.abs(diff).toFixed(2)} ({diff > 0 ? "supplier higher" : "ERP higher"})
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            disabled={!canEdit}
          />
        </div>

        {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

        {canEdit && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save verification"}
          </button>
        )}
      </form>
    </div>
  );
}
