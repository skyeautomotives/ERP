"use client";

import { useState, useTransition } from "react";
import { createGstReturnPeriod } from "./actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function NewPeriodForm() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [returnType, setReturnType] = useState<"GSTR-1" | "GSTR-3B">("GSTR-1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createGstReturnPeriod({ period_month: month, period_year: year, return_type: returnType });
          if (result?.error) setError(result.error);
        });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Month</label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Return type</label>
        <select
          value={returnType}
          onChange={(e) => setReturnType(e.target.value as "GSTR-1" | "GSTR-3B")}
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="GSTR-1">GSTR-1</option>
          <option value="GSTR-3B">GSTR-3B</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add period"}
      </button>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </form>
  );
}
