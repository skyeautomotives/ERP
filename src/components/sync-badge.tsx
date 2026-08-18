"use client";

import { useEffect, useState } from "react";
import { pendingCount } from "@/lib/offline-queue";

export function SyncBadge({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(pendingCount(userId));
    update();
    window.addEventListener("storage", update);
    window.addEventListener("online", update);
    const interval = setInterval(update, 3000);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("online", update);
      clearInterval(interval);
    };
  }, [userId]);

  if (count === 0) return null;

  return (
    <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count} pending
    </span>
  );
}
