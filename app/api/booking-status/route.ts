/**
 * SIMULACE: sdílený stav „Dnešních objednávek“ (přišel / odebrán) pro všechny recepce pobočky.
 * Dřív byl jen v prohlížeči (každá recepce viděla něco jiného). Soubor .data/booking-status.json (mimo git),
 * drží se posledních 14 dní. V produkci nahradí backend (docs/PRODUKCE.md – most booking-status).
 *
 *   GET  ?date=YYYY-MM-DD            → { [id]: { status, by, at } }
 *   POST { date, id, status | null, by } → uloží (null = zpět na „objednáno“), vrátí stav dne
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type Status = "checked_in" | "removed";
type Entry = { status: Status; by: string | null; at: string };
type Store = Record<string, Record<string, Entry>>;

const FILE = path.join(process.cwd(), ".data", "booking-status.json");
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function read(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
  } catch {
    return {};
  }
}

// zápisy za sebou (dvě recepce kliknou naráz → nepřepsat si navzájem)
let queue: Promise<unknown> = Promise.resolve();

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!DAY.test(date)) return NextResponse.json({ error: "Chybí datum" }, { status: 400 });
  return NextResponse.json((await read())[date] ?? {});
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { date?: string; id?: string; status?: Status | null; by?: string } | null;
  if (!b?.date || !DAY.test(b.date) || !b.id || (b.status != null && !["checked_in", "removed"].includes(b.status))) {
    return NextResponse.json({ error: "Neplatná data" }, { status: 400 });
  }
  const run = queue.then(async () => {
    const store = await read();
    const day = (store[b.date!] ??= {});
    if (b.status) day[b.id!] = { status: b.status, by: b.by ?? null, at: new Date().toISOString() };
    else delete day[b.id!];
    // starší než 14 dní pryč
    const limit = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    for (const d of Object.keys(store)) if (d < limit) delete store[d];
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(store, null, 1), "utf8");
    return day;
  });
  queue = run.catch(() => {});
  return NextResponse.json(await run);
}
