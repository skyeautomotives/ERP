"use client";

import { useActionState, useEffect, useState } from "react";
import { createExpenseCategory, type CategoryFormState } from "./actions";

const initialState: CategoryFormState = { error: null };

export function CategoryForm() {
  const [state, formAction, pending] = useActionState(createExpenseCategory, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pending && !state.error && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        New category
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-end gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category name</label>
        <input
          name="name"
          required
          autoComplete="off"
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Cancel
      </button>
    </form>
  );
}
