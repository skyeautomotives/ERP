"use client";

import Link from "next/link";

export function PrintShareActions({
  backHref,
  backLabel = "Back to list",
  shareText,
  phone,
}: {
  backHref: string;
  backLabel?: string;
  shareText: string;
  phone?: string | null;
}) {
  function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      navigator.share({ text: shareText }).catch(() => {});
      return;
    }
    const digits = (phone ?? "").replace(/[^0-9]/g, "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Link
        href={backHref}
        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {backLabel}
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Print / Save as PDF
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-md border border-green-300 dark:border-green-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
      >
        Share to WhatsApp
      </button>
    </div>
  );
}
