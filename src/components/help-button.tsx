"use client";

import { useEffect, useRef, useState } from "react";
import type { HelpContent } from "@/lib/help-content";

export function HelpButton({ content }: { content: HelpContent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        aria-expanded={open}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
      >
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-20 w-80 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{content.title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{content.description}</p>

          {content.fields.length > 0 && (
            <dl className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
              {content.fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs font-semibold text-gray-700 dark:text-gray-300">{f.label}</dt>
                  <dd className="text-xs text-gray-500 dark:text-gray-400">{f.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
