import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Soft cross-fades between pages, and the card photo morphing into the
    // wine page's plate. Safari 18+ / Chrome; older browsers just hard-cut.
    viewTransition: true,
  },
  async headers() {
    return [
      {
        // The service worker must never be served stale, or updates won't land.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
