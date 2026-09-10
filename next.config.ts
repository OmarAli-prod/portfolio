import type { NextConfig } from "next";

// ponytail: hardcoded repo name; drop basePath if you rename repo to OmarAli-prod.github.io
const basePath = process.env.GITHUB_ACTIONS ? "/portfolio" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Raw <a href> (cmd-click fallbacks) need this; next/link prefixes basePath itself.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
