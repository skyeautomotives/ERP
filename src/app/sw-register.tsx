"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/offline shell is a nice-to-have; a failed registration
        // shouldn't block the app from working online.
      });
    }
  }, []);

  return null;
}
