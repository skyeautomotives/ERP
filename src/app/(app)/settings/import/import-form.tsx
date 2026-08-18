"use client";

import { useState, useTransition } from "react";
import { importLegacyData, type ImportResult } from "./actions";

function SkipList({ skipped }: { skipped: { row: number; reason: string }[] }) {
  if (skipped.length === 0) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-amber-700 dark:text-amber-400">
        {skipped.length} row(s) skipped
      </summary>
      <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-gray-500 dark:text-gray-400">
        {skipped.map((s, i) => (
          <li key={i}>{s.row === -1 ? s.reason : `Row ${s.row}: ${s.reason}`}</li>
        ))}
      </ul>
    </details>
  );
}

export function ImportForm() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await importLegacyData(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(res);
    });
  }

  return (
    <div>
      <div className="mt-4 max-w-lg rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Export</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Download every customer, product, and current stock level as a spreadsheet in this same format - a backup,
          or a starting point to edit and re-import.
        </p>
        <a
          href="/api/settings/export"
          className="mt-3 inline-block rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Export current data
        </a>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Import</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Legacy export file (.xls or .xlsx)
          </label>
          <input
            type="file"
            name="file"
            accept=".xls,.xlsx"
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Importing..." : "Import"}
        </button>
      </form>

      {result && (
        <div className="mt-6 max-w-lg space-y-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Routes</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{result.routes?.created ?? 0} created</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Customers</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {result.customers?.created ?? 0} created, {result.customers?.updated ?? 0} updated
            </p>
            {result.customers && <SkipList skipped={result.customers.skipped} />}
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Products</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {result.products?.created ?? 0} created, {result.products?.updated ?? 0} updated
            </p>
            {result.products && <SkipList skipped={result.products.skipped} />}
          </div>
        </div>
      )}
    </div>
  );
}
