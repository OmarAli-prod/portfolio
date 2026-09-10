import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // ponytail: hardcoded repo name; drop basePath if you rename repo to OmarAli-prod.github.io
  basePath: process.env.GITHUB_ACTIONS ? "/portfolio" : "",
  images: { unoptimized: true },
};

export default nextConfig;
