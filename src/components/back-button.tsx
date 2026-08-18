"use client";

import { usePathname, useRouter } from "next/navigation";

const NO_BACK_PATHS = new Set(["/dashboard", "/my/dashboard"]);

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (NO_BACK_PATHS.has(pathname)) return null;

  return (
    <button
      onClick={() => router.back()}
      className="no-print mb-3 flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 4L6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
