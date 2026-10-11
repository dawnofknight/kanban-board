import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* local-first kanban: fully client-rendered, no static prerender for app routes */
  cacheComponents: false,
  // partialPrefetching requires cacheComponents; disabled for local-first app
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
