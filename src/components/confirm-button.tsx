"use client";

import { createPortal } from "react-dom";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ConfirmButton({
  id,
  label,
  confirmTitle,
  confirmBody,
  confirmLabel = "Confirm",
  variant = "danger",
  action,
  redirectTo,
}: {
  id: string;
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  action: (id: string) => Promise<{ error: string | null }>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const triggerClass =
    variant === "danger"
      ? "rounded-md border border-red-200 dark:border-red-900 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
      : "rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800";

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={triggerClass}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{confirmTitle}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{confirmBody}</p>
              {error && (
                <p className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await action(id);
                      if (result?.error) {
                        setError(result.error);
                        return;
                      }
                      setOpen(false);
                      if (redirectTo) {
                        router.push(redirectTo);
                      } else {
                        router.refresh();
                      }
                    })
                  }
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending ? "Working..." : confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
