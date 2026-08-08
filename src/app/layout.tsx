import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cellar Notes",
  description: "A private log of the wines you've had, and what you thought of them.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cellar Notes",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#141010",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
