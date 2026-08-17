"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertSalesOrder, cancelSalesOrder } from "./actions";

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await convertSalesOrder(orderId);
              if (result.error) {
                setError(result.error);
                return;
              }
              if (result.invoiceId) router.push(`/sales/${result.invoiceId}`);
            })
          }
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Converting..." : "Convert to invoice"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm("Cancel this order?")) return;
            startTransition(async () => {
              await cancelSalesOrder(orderId);
              router.refresh();
            });
          }}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Cancel order
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
