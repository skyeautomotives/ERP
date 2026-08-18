"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

export type QuickAddField = {
  name: string;
  label: string;
  type?: "text" | "number";
  required?: boolean;
};

export type QuickAddResult = {
  error: string | null;
  id?: string;
  label?: string;
  [key: string]: unknown;
};

/** Generic "+ New" trigger + popup dialog for creating a master-data row
 * (customer/supplier/product) without leaving the Sales/Purchase entry
 * screen it's used from. The caller adapts the dialog's plain string values
 * into whatever typed payload its own quick-create server action expects. */
export function QuickAddButton({
  buttonLabel,
  dialogTitle,
  fields,
  onSubmit,
  onCreated,
}: {
  buttonLabel: string;
  dialogTitle: string;
  fields: QuickAddField[];
  onSubmit: (values: Record<string, string>) => Promise<QuickAddResult>;
  onCreated: (result: QuickAddResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setValues({});
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    for (const f of fields) {
      if (f.required && !(values[f.name] ?? "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      onCreated(result);
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        {buttonLabel}
      </button>

      {open &&
        createPortal(
          // Portaled to document.body rather than rendered in place - every
          // caller here sits inside a Sales/Purchase <form>, and this dialog
          // has its own <form> for its own submit/Enter-to-submit behavior;
          // nesting <form> inside <form> is invalid HTML and breaks hydration.
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={close}
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dialogTitle}</h2>
              <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                {fields.map((f) => (
                  <div key={f.name}>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      {f.label}
                    </label>
                    <input
                      type={f.type ?? "text"}
                      value={values[f.name] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                      autoComplete="off"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                ))}

                {error && (
                  <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pending ? "Saving..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
