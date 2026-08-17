"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserActive } from "./actions";

export function UserRowActions({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return <span className="text-xs text-gray-400">You</span>;
  }

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setUserActive(userId, !isActive);
          router.refresh();
        })
      }
      className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
