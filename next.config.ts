import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    return [
      {
        source: "/CardFileWebWS/rest/:path*",
        destination: "http://localhost:8080/CardFileWebWS/rest/:path*",
      },
    ];
  },
};

export default nextConfig;
