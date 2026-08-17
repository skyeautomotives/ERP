"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function CancelInvoiceButton({
  invoiceId,
  action,
  label = "Cancel invoice",
}: {
  invoiceId: string;
  action: (invoiceId: string) => Promise<void>;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this invoice? Stock quantities will be restored.")) return;
        startTransition(async () => {
          await action(invoiceId);
          router.refresh();
        });
      }}
      className="rounded-md border border-red-200 dark:border-red-900 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-60"
    >
      {pending ? "Cancelling..." : label}
    </button>
  );
}
