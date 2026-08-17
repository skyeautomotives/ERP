"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSalesInvoice } from "./actions";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this invoice? Stock quantities will be restored.")) return;
        startTransition(async () => {
          await cancelSalesInvoice(invoiceId);
          router.refresh();
        });
      }}
      className="rounded-md border border-red-200 dark:border-red-900 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-60"
    >
      {pending ? "Cancelling..." : "Cancel invoice"}
    </button>
  );
}
