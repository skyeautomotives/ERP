"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
      <span>
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`rounded-md border border-gray-300 px-3 py-1 ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
          }`}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`rounded-md border border-gray-300 px-3 py-1 ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
