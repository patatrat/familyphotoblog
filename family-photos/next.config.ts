import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp uses native bindings — must not be bundled by webpack
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
