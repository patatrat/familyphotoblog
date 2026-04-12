import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp uses native bindings — must not be bundled by webpack
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
