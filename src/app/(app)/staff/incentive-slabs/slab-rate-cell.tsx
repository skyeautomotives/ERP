"use client";

import { useState, useTransition } from "react";
import { updateSlabRate } from "./actions";

export function SlabRateCell({ id, initialRate, canEdit }: { id: string; initialRate: number; canEdit: boolean }) {
  const [rate, setRate] = useState(String(initialRate));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return <span className="text-gray-900 dark:text-gray-100">{initialRate.toFixed(2)}%</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        min="0"
        value={rate}
        onChange={(e) => {
          setRate(e.target.value);
          setSaved(false);
        }}
        className="w-20 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
      />
      <span className="text-gray-500 dark:text-gray-400">%</span>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await updateSlabRate(id, Number(rate));
            setSaved(true);
          })
        }
        className="rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
