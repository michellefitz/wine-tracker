"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which is what makes the app installable to the
 * home screen. It only caches the app shell — wine data always comes from the
 * network so the log is never stale.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing just means no home-screen install; the app works.
    });
  }, []);

  return null;
}
