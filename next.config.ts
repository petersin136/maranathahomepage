import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sdaiokbvorwbomjasqzc.supabase.co",
        pathname: "/storage/v1/object/public/**"
      }
    ]
  }
};

export default nextConfig;
