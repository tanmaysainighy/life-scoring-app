import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // node:sqlite is a Node builtin — keep it out of the bundler graph.
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,

  // Self-contained server bundle for deployment (see DEPLOY.md).
  output: "standalone",

  // schema.sql is read at runtime rather than imported, so the bundler can't
  // see it. Without this it would be missing from the deployed image and the
  // database would fail to open on first boot.
  outputFileTracingIncludes: {
    "/**": ["./src/lib/schema.sql"],
  },
};

export default config;
