import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // @react-pdf/renderer uses Node.js APIs — must stay server-side only
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
