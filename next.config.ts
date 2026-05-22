import type { NextConfig } from "next";

// Security headers are set in src/proxy.ts (middleware) so they apply to all
// authenticated and public routes with correct CSP directives (including
// analytics.radomski.co.nz). Defining them here too would cause the browser to
// apply the intersection of two CSP headers, silently breaking the analytics
// script and creating a confusing policy split.
const nextConfig: NextConfig = {
  // sharp uses native bindings — must not be bundled by webpack
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
