import type { NextConfig } from "next";
const backend = (process.env.BACKEND_URL || "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
const nextConfig: NextConfig = {
  experimental: { proxyClientMaxBodySize: "1100mb", proxyTimeout: 360000 },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default nextConfig;
