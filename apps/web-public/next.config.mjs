import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@blog/contracts"],
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: apiBaseUrl + "/api/:path*",
      },
      {
        source: "/media/:path*",
        destination: apiBaseUrl + "/media/:path*",
      },
    ];
  },
};

export default nextConfig;
