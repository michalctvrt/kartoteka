/**
 * Dev proxy pro Václavův backend `/CardFileWebWS/*`.
 *
 * Frontend (generated klient) volá relativní `/api/cardfile/rest/...`,
 * tahle route forwarduje request na reálný backend a přidává JSESSIONID(SSO)
 * cookie z `.env.local`, abychom obešli FORM-based auth pro vývoj.
 *
 * 🔐 NEPOUŽÍVAT V PRODUKCI. Cookie je dev-only — produkce poběží same-origin
 * pod `/CardFileWebWS/michalovo/...` (Václavův plán) a auth se vyřeší přes
 * sdílenou session prohlížeče.
 *
 * Konfigurace v .env.local:
 *   BACKEND_BASE_URL=http://localhost:8080
 *   BACKEND_DEV_COOKIE=JSESSIONIDSSO=...; JSESSIONID=...
 */

import { NextRequest } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:8080";
const BACKEND_PREFIX = "/CardFileWebWS";
const DEV_COOKIE = process.env.BACKEND_DEV_COOKIE;

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx);
}

async function forward(req: NextRequest, ctx: Ctx) {
  if (!DEV_COOKIE) {
    return jsonError(
      500,
      "BACKEND_DEV_COOKIE chybí v .env.local. Přihlas se do staré kartotéky a zkopíruj cookie z DevTools."
    );
  }

  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${BACKEND_BASE}${BACKEND_PREFIX}/${path.join("/")}${
    url.search
  }`;

  const headers = new Headers();
  // Forward selektivně — ne všechny browser headers má smysl předávat
  copyHeader(req, headers, "content-type");
  copyHeader(req, headers, "accept", "application/json");
  copyHeader(req, headers, "accept-language");
  // Auth cookie pro Václavův backend
  headers.set("cookie", DEV_COOKIE);

  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let response: Response;
  try {
    response = await fetch(target, {
      method: req.method,
      headers,
      body,
      // Backend může chtít redirectovat na login form — zachytíme to a vrátíme jako 401
      redirect: "manual",
    });
  } catch (e) {
    console.error(`[cardfile-proxy] fetch failed: ${target}`, e);
    return jsonError(
      502,
      `Backend ${BACKEND_BASE}${BACKEND_PREFIX} nedostupný. Detail: ${
        (e as Error).message
      }`
    );
  }

  // Pokud backend vrátí 3xx (typicky redirect na login), znamená to, že cookie
  // expirovala. Frontend tomu lépe rozumí jako 401, takže přepíšeme.
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    if (location.includes("login") || location.includes("index.xhtml")) {
      return jsonError(
        401,
        "Backend vyžaduje login. Cookie v BACKEND_DEV_COOKIE asi expirovala — vytáhni novou ze staré kartotéky."
      );
    }
  }

  // Detekce: backend místo JSON vrátil "Hello World" HTML (typický symptom
  // toho, že request odešel jinam než si myslíme nebo že session není platná)
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.toLowerCase().includes("json") &&
    response.status === 200 &&
    contentType.toLowerCase().includes("html")
  ) {
    return jsonError(
      401,
      "Backend vrátil HTML místo JSONu — cookie nejspíš nesedí nebo je špatný path. Zkontroluj BACKEND_DEV_COOKIE."
    );
  }

  // Forward status + body + content-type
  const respHeaders = new Headers();
  respHeaders.set(
    "content-type",
    contentType || "application/json; charset=utf-8"
  );
  // Cache-control nedáváme — generated klient si ho řídí sám

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}

function copyHeader(
  src: NextRequest,
  dst: Headers,
  name: string,
  fallback?: string
) {
  const v = src.headers.get(name) ?? fallback;
  if (v) dst.set(name, v);
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
