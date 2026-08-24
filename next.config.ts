import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * sharp is a native module and must be required at runtime rather than
   * bundled into the function, or the binary it needs isn't there beside it.
   */
  serverExternalPackages: ["sharp"],

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
