"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, and makes sure a new one actually takes over.
 *
 * Registering was all this used to do, which is enough to be installable and
 * not enough to stay current. A worker that is already installed is not
 * re-fetched just because you opened the app, so an installed home-screen copy
 * could sit on the version it was installed with — and the symptom is the
 * worst kind: everything works, nothing errors, and the app is simply the app
 * from a fortnight ago. "I deployed it but I can't see it" is not a thing
 * anyone should have to debug from a phone.
 *
 * So: ask for the newest worker on every open, and reload once when a new one
 * takes control. The worker calls skipWaiting and clients.claim, so a new
 * version activates immediately rather than waiting for every tab to close.
 *
 * The guards matter more than the code. `hadController` skips the reload on a
 * first-ever install, where the controller arriving is the normal course of
 * events rather than an update; `reloading` makes sure that even if
 * controllerchange fires twice, the page reloads once. A service worker that
 * can reload the page is a service worker that can reload the page forever.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    function onControllerChange() {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Registration alone returns the existing worker; this is what asks
        // the network whether there's a newer one.
        void registration.update();
      })
      .catch(() => {
        // Registration failing just means no home-screen install; the app works.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
