import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; a stray lockfile above this directory would
  // otherwise be picked up as the inferred root.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
