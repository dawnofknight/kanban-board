import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* kanban app is fully client-rendered; no static prerender for app routes */
  cacheComponents: false,
  // partialPrefetching requires cacheComponents; disabled for this app
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
