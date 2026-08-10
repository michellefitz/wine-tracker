import type { Metadata, Viewport } from "next";
import { Archivo, Spectral } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
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
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f4f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className={`${grotesk.variable} ${serif.variable}`}>
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
