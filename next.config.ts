import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // A user Pages repository is hosted at the domain root, without a basePath.
};

export default nextConfig;
