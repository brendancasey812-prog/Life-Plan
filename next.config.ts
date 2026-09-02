import type { NextConfig } from "next";

/**
 * The whole app is client-side — every plan lives in the browser's local
 * storage — so it exports to plain static files. BUILD_TARGET=pages adds the
 * repo-name prefix GitHub Pages serves the site under; local dev and any
 * root-hosted deploy leave it off.
 */
const repo = "Life-Plan";
const isPages = process.env.BUILD_TARGET === "pages";

const nextConfig: NextConfig = {
  output: "export",
  ...(isPages ? { basePath: `/${repo}`, assetPrefix: `/${repo}/` } : {}),
  images: { unoptimized: true },
  // Emit /weeks/index.html style folders so refreshes work on a static host.
  trailingSlash: true,
};

export default nextConfig;
