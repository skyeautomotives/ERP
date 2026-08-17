"use client";

import { useState, useTransition } from "react";
import { advanceGstReturnStatus, updateGstReturnNotes } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  verified: "Verified",
  ready_for_filing: "Ready for filing",
  filed: "Filed",
};
const NEXT_LABEL: Record<string, string> = {
  draft: "Mark verified",
  verified: "Mark ready for filing",
  ready_for_filing: "Mark filed",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  verified: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
  ready_for_filing: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  filed: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function GstReturnRow({
  period,
  canEdit,
}: {
  period: {
    id: string;
    period_month: number;
    period_year: number;
    return_type: string;
    status: string;
    notes: string | null;
    filed_reference_number: string | null;
  };
  canEdit: boolean;
}) {
  const [notes, setNotes] = useState(period.notes ?? "");
  const [ref, setRef] = useState(period.filed_reference_number ?? "");
  const [pending, startTransition] = useTransition();
  const [savingNotes, startNotesTransition] = useTransition();

  return (
    <tr className="align-top">
      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
        {MONTH_NAMES[period.period_month - 1]} {period.period_year}
      </td>
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{period.return_type}</td>
      <td className="px-4 py-3">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[period.status]}`}>
          {STATUS_LABELS[period.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={1}
          disabled={!canEdit}
          autoComplete="off"
          placeholder="Notes"
          className="w-40 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          disabled={!canEdit}
          autoComplete="off"
          placeholder="Reference # (after you file)"
          className="w-40 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-3">
        {canEdit && (
          <div className="flex flex-col gap-1">
            <button
              disabled={savingNotes}
              onClick={() => startNotesTransition(() => updateGstReturnNotes(period.id, notes, ref))}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
            {period.status !== "filed" && (
              <button
                disabled={pending}
                onClick={() => startTransition(() => advanceGstReturnStatus(period.id, period.status))}
                className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pending ? "Updating..." : NEXT_LABEL[period.status]}
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
