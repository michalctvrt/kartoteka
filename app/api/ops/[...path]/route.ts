/**
 * Brána na backend provozní aplikace `/opt/testapp` (hromadný tisk, lékaři,
 * online přístup, spotřební materiál). Originál se NEMĚNÍ – voláme jen ty
 * adresy, které používá i jeho vlastní frontend (viz docs/TESTAPP.md).
 *
 *   /api/ops/tisk-studies?…  →  TESTAPP_API_URL/tisk-studies?…   (adresa jen v .env.local)
 *
 * Povolené jsou jen cesty v ALLOW (metoda + vzor). DEMO_MODE=1 → smyšlená data.
 */

import { NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoOps } from "@/lib/demo/ops";
import { callVzp } from "@/lib/ops/vzp";

// adresa backendu provozní aplikace – jen v .env.local (TESTAPP_API_URL)
const BASE = (process.env.TESTAPP_API_URL ?? "").replace(/\/+$/, "");

const ALLOW: [string, RegExp][] = [
  ["GET", /^tisk-studies$/],
  ["GET", /^tisk-pdf$/],
  ["GET", /^study-pdf\/\d+$/],
  ["GET", /^check-study$/], // platnost online přístupu ke zprávě
  ["POST", /^extend-validity$/], // prodloužení online přístupu (ZÁPIS do DB kartotéky)
  ["POST", /^vzp$/], // ověření pojištění → samostatná služba (lib/ops/vzp.ts)
  ["GET", /^medical_institution$/], // připojení lékaři (CGM / E-zpráva / LIVEcom)
];

type Ctx = { params: Promise<{ path: string[] }> };

export const GET = (req: NextRequest, ctx: Ctx) => forward(req, ctx);
export const POST = (req: NextRequest, ctx: Ctx) => forward(req, ctx);
export const PUT = (req: NextRequest, ctx: Ctx) => forward(req, ctx);
export const DELETE = (req: NextRequest, ctx: Ctx) => forward(req, ctx);

async function forward(req: NextRequest, ctx: Ctx) {
  const path = (await ctx.params).path.join("/");
  if (!ALLOW.some(([m, re]) => m === req.method && re.test(path))) {
    return json(403, { error: `Kartotéka tuto adresu provozní aplikace nevolá: ${req.method} ${path}` });
  }
  const url = new URL(req.url);
  const text = ["GET", "DELETE"].includes(req.method) ? undefined : await req.text();

  if (DEMO_MODE) return demoOps(req.method, path, url.searchParams, text);

  if (path === "vzp") {
    const r = await callVzp(text ?? "{}");
    return new Response(r.text, { status: r.status, headers: { "content-type": "application/json; charset=utf-8" } });
  }
  if (!BASE) return json(500, { error: "TESTAPP_API_URL není nastavené v .env.local" });

  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}${url.search}`, {
      method: req.method,
      headers: text !== undefined ? { "content-type": "application/json" } : undefined,
      body: text,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000), // sloučené PDF za celý den může chvíli trvat
    });
  } catch (e) {
    return json(502, { error: `Provozní aplikace nedostupná: ${(e as Error).message}` });
  }
  const headers = new Headers({ "content-type": res.headers.get("content-type") ?? "application/json" });
  const cd = res.headers.get("content-disposition");
  if (cd) headers.set("content-disposition", cd);
  return new Response(res.body, { status: res.status, headers });
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
