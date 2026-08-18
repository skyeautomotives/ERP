"use client";

import { useEffect, useState } from "react";
import { list, type QueueItem } from "@/lib/offline-queue";

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  pending: "Pending Sync",
  uploading: "Uploading",
  synced: "Synced",
  failed: "Failed - will retry",
};

const STATUS_COLOR: Record<QueueItem["status"], string> = {
  pending: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  uploading: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  synced: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  failed: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
};

const TYPE_LABEL: Record<QueueItem["type"], string> = {
  sales_order: "Sales Order",
  receipt: "Receipt",
  payment: "Payment",
};

export function SyncStatusList({ userId }: { userId: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    const update = () => setItems(list(userId).slice().reverse());
    update();
    const interval = setInterval(update, 2000);
    window.addEventListener("storage", update);
    window.addEventListener("online", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", update);
      window.removeEventListener("online", update);
    };
  }, [userId]);

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Saved at</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <tr key={item.localId}>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{TYPE_LABEL[item.type]}</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                {item.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{item.error}</p>}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                Nothing queued on this device - everything you've entered has synced.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
