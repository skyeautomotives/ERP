"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertSalesOrder, cancelSalesOrder } from "./actions";
import { ConfirmButton } from "@/components/confirm-button";

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
        <ConfirmButton
          id={orderId}
          label="Cancel order"
          confirmTitle="Cancel this order?"
          confirmBody="This order will be marked cancelled."
          confirmLabel="Cancel order"
          action={cancelSalesOrder}
        />
      </div>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
