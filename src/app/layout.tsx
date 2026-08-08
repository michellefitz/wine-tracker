import type { Metadata, Viewport } from "next";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

/**
 * Fraunces carries the optical-size axis, so headings get the high-contrast
 * display cut and running text gets sturdier strokes — from one file, handled
 * by the browser. See `.serif-display` / `.serif-text` in globals.css.
 */
const displaySerif = Fraunces({
  subsets: ["latin"],
  axes: ["WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const bodySans = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
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
  themeColor: "#fbfaf7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className={`${displaySerif.variable} ${bodySans.variable}`}>
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
