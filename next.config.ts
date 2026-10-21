import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/admin/owner/pdf": ["./lib/admin/fonts/**/*"],
    "/api/admin/export": ["./lib/admin/fonts/**/*"],
    "/api/admin/sales/pdf": ["./lib/admin/fonts/**/*"],
    "/api/admin/expenses/pdf": ["./lib/admin/fonts/**/*"],
    "/api/admin/settlements/pdf": ["./lib/admin/fonts/**/*"]
  },
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
