"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeactivateButton({
  id,
  isActive,
  action,
}: {
  id: string;
  isActive: boolean;
  action: (id: string, isActive: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await action(id, !isActive);
          router.refresh();
        })
      }
      className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
        isActive
          ? "border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          : "border-green-200 dark:border-green-900 text-green-600 hover:bg-green-50"
      }`}
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
