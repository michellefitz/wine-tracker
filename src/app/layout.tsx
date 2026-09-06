import type { Metadata, Viewport } from "next";
import { Archivo, Spectral } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import { PAPER } from "@/lib/chrome";
import "./globals.css";

/* The quiet workhorse: UI labels, buttons, captions, letterspaced caps. */
const grotesk = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/*
 * One serif for all the content: 300 for tasting notes and prose, 500 for the
 * masthead — the whole app speaks in a single bookish voice.
 */
const serif = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Cellar Notes",
  description: "A private log of the wines you've had, and what you thought of them.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cellar Notes",
    /*
     * The page draws under the status bar, which is the only way the strip
     * behind the clock can be part of the app at all.
     *
     * It was "default", where iOS reserves that strip and paints it itself
     * from the theme-color tag. Nothing in the page can reach it: the scrim
     * that dims the shelf when a sheet opens stops at the top of the web view,
     * so the strip stayed bright over a darkened page, and every attempt to
     * keep the tag in step arrived late because iOS repaints that strip when
     * it feels like it. Translucent, there is no reserved strip — the page
     * runs to the top of the screen, the scrim covers it like everything else,
     * and it dims in the same frame because it is the same element.
     *
     * The cost is that iOS draws the clock and the battery in white over our
     * cream. Everything above pads by env(safe-area-inset-top), which is no
     * longer zero, so nothing of ours ends up underneath them.
     */
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: PAPER,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/**
 * `sheet` is a parallel slot, filled only when a route is intercepted into it.
 *
 * Nothing here wraps the app in a view transition any more. Opening a sheet is
 * a navigation, so the router put every one of them inside
 * document.startViewTransition — which freezes a snapshot of the whole page for
 * the length of the transition. Measured at 390ms, during which the sheet's own
 * slide was running underneath a still image and then appearing in its final
 * position. The cross-fade cost more than it was worth once the main navigation
 * in the app became a sheet.
 */
export default function RootLayout({
  children,
  sheet,
}: {
  children: React.ReactNode;
  sheet: React.ReactNode;
}) {
  return (
    <html
      lang="en-IE"
      className={`${grotesk.variable} ${serif.variable}`}
      style={{ backgroundColor: PAPER }}
    >
      <body>
        {/*
          Which build this is, so "have my changes actually shipped?" is a
          question with an answer rather than a debate. Vercel sets the SHA;
          locally there isn't one and the tag says so.
        */}
        <meta
          name="x-build"
          content={process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}
        />
        <ServiceWorker />
        {children}
        {sheet}
      </body>
    </html>
  );
}
