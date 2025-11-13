import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mhnrqqnwljoyiguqzrcp.supabase.co",
        pathname: "/storage/v1/object/public/portfolio-media/**"
      }
    ]
  }
};

export default nextConfig;
