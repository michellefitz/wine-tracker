import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const displaySerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const bodySans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
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
