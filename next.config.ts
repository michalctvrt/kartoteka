import type { NextConfig } from "next";
// demo režim → frontend dostane smyšlené pobočky (lib/runtimeConfig.ts)
import { DEMO_MODE } from "./lib/demo/mode";

/**
 * Dva režimy:
 *   vývoj / test server (npm run dev)     – Next server, API routes v app/api jsou „mosty“ (proxy, simulace)
 *   produkce (npm run build:static)        – STATICKÝ WEB do složky out/, přibalí se do EARu (docs/PRODUKCE.md):
 *                                            bez app/api (route.ts se nesestaví), mosty dělá Java backend
 * STATIC_EXPORT=1 zapne statický režim, NEXT_BASE_PATH = pod jakou adresou poběží (např. /CFLocalSyncWeb/m).
 */
const STATIC = process.env.STATIC_EXPORT === "1";
const BASE_PATH = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH, NEXT_PUBLIC_DEMO_BRANCHES: DEMO_MODE && !STATIC ? "1" : "" },
  ...(STATIC
    ? {
        output: "export",
        basePath: BASE_PATH || undefined,
        // každá stránka jako složka s index.html → Payara ji najde i bez přípony
        trailingSlash: true,
        // jen .tsx = stránky; route.ts (app/api – mosty pro vývoj) se do statického webu nesestaví
        pageExtensions: ["tsx"],
      }
    : {
        async rewrites() {
          return [
            {
              source: "/CardFileWebWS/rest/:path*",
              destination: "http://localhost:8080/CardFileWebWS/rest/:path*",
            },
          ];
        },
      }),
};

export default nextConfig;
