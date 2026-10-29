/**
 * Stav systému pro Nastavení → Stav systému.
 * Zjistí, jestli odpovídá backend kartotéky, vyvolávací systém a jestli jsou
 * nastavené objednávky (SuperSaaS). Klíče ani cookie neposílá do prohlížeče.
 */
import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo/mode";
import { call250v, isMock } from "@/lib/call250v/server";

type State = "ok" | "demo" | "warning" | "error";
type Check = { state: State; text: string; ms?: number };

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:8080";
const DEV_COOKIE = process.env.BACKEND_DEV_COOKIE;

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const r = await fn();
  return [r, Date.now() - t];
}

async function backend(): Promise<Check> {
  if (DEMO_MODE) return { state: "demo", text: "Demo režim – smyšlená data, backend se nevolá" };
  if (!DEV_COOKIE) return { state: "error", text: "Chybí přihlášení k backendu (BACKEND_DEV_COOKIE v .env.local)" };
  try {
    const [res, ms] = await timed(() =>
      fetch(`${BACKEND_BASE}/CardFileWebWS/rest/insurance-company`, {
        headers: { cookie: DEV_COOKIE, accept: "application/json" },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
    );
    const html = (res.headers.get("content-type") ?? "").includes("html");
    if ((res.status >= 300 && res.status < 400) || res.status === 401 || html)
      return { state: "warning", text: "Odpovídá, ale přihlášení vypršelo – obnovit cookie v .env.local", ms };
    if (!res.ok) return { state: "error", text: `Odpovídá chybou ${res.status}`, ms };
    return { state: "ok", text: "Odpovídá", ms };
  } catch (e) {
    return { state: "error", text: `Nedostupný (${(e as Error).message})` };
  }
}

const tickets = (n: number) => `${n} ${n === 1 ? "lístek" : n >= 2 && n <= 4 ? "lístky" : "lístků"}`;

async function queue(): Promise<Check> {
  try {
    const [items, ms] = await timed(() => call250v.list());
    if (isMock) return { state: "demo", text: `Simulace · ${tickets(items.length)} (Call250V zatím nepřipojen)`, ms };
    return { state: "ok", text: `Připojeno · ${tickets(items.length)} ve frontě`, ms };
  } catch (e) {
    return { state: "error", text: (e as Error).message };
  }
}

function bookings(): Check {
  if (DEMO_MODE) return { state: "demo", text: "Demo režim – smyšlené objednávky" };
  return process.env.SUPERSAAS_USER && process.env.SUPERSAAS_API_KEY
    ? { state: "ok", text: "Nastaveno" }
    : { state: "warning", text: "Chybí klíče SUPERSAAS_* – kalendář objednávek bude prázdný" };
}

export async function GET() {
  const [b, q] = await Promise.all([backend(), queue()]);
  return NextResponse.json({ checkedAt: new Date().toISOString(), backend: b, queue: q, bookings: bookings() });
}
