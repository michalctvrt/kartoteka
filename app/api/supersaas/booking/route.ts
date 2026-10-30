import { NextResponse } from "next/server";
import { demoBookings, demoCreateBooking } from "@/lib/demo/bookings";
import { DEMO_MODE } from "@/lib/demo/mode";
import { CALENDARS, DEFAULT_CALENDAR, calendarById, type NewBooking } from "@/lib/supersaas/calendars";
import { SS_BASE, ssAuth, ssError, writeBlocked } from "@/lib/supersaas/server";

// 🔐 Credentials se čtou z .env.local (NEVER commit)
const ACCOUNT_NAME = process.env.SUPERSAAS_USER;
const API_KEY = process.env.SUPERSAAS_API_KEY;
const BASE_URL = "https://www.supersaas.com/api";

interface SuperSaaSBooking {
  id: number;
  full_name?: string;
  start?: string;
  finish?: string;
  end?: string;
  service_name?: string;
  mobile?: string;
  email?: string;
  field_1?: string; // datum narození
  field_2_r?: string; // pohlaví
  field_1_r?: string; // vyšetření
}

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: "booked" | "free";
  details?: Record<string, string | number | boolean | null>;
}

/** 🕓 Převod UTC času na české pásmo */
function toCzechISO(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();

  const utcDate = new Date(dateStr);
  const czParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(utcDate);

  const parts: Record<string, string> = {};
  for (const p of czParts) {
    if (p.type && p.value) parts[p.type] = p.value;
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scheduleId = Number(searchParams.get("schedule_id") ?? DEFAULT_CALENDAR);
  // jen kalendáře z lib/supersaas/calendars.ts (ne všechno, co na účtu je)
  if (!CALENDARS.some((c) => c.id === scheduleId)) {
    return NextResponse.json({ error: "Tento kalendář Kartotéka nezobrazuje" }, { status: 403 });
  }
  // Demo režim (doma / bez klíčů): smyšlené objednávky, SuperSaaS se nevolá
  if (DEMO_MODE) return NextResponse.json(demoBookings(scheduleId));
  if (!ACCOUNT_NAME || !API_KEY) {
    console.error(
      "❌ Chybí SUPERSAAS_USER nebo SUPERSAAS_API_KEY v .env.local"
    );
    return NextResponse.json(
      { error: "SuperSaaS credentials nejsou nakonfigurované" },
      { status: 500 }
    );
  }

  const authHeader = `Basic ${Buffer.from(
    `${ACCOUNT_NAME}:${API_KEY}`
  ).toString("base64")}`;

  try {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 2);

    const fromISO = from.toISOString().split("T")[0];
    const toISO = to.toISOString().split("T")[0];

    const rangeUrl = `${BASE_URL}/range/${scheduleId}.json?from=${fromISO}&to=${toISO}&limit=1000`;
    console.log("📅 Fetching bookings:", rangeUrl);

    const rangeRes = await fetch(rangeUrl, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!rangeRes.ok) {
      console.error("❌ Range API error:", rangeRes.status);
      // chybu ukázat (dřív se vracel prázdný seznam = vypadalo to jako „nikdo objednaný“)
      return NextResponse.json({ error: `SuperSaaS odpověděl ${rangeRes.status}` }, { status: 502 });
    }

    const data = (await rangeRes.json()) as
      | SuperSaaSBooking[]
      | { bookings?: SuperSaaSBooking[] }
      | unknown;

    const bookingsArray: SuperSaaSBooking[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { bookings?: SuperSaaSBooking[] }).bookings)
      ? (data as { bookings: SuperSaaSBooking[] }).bookings ?? []
      : [];

    const mapped: CalendarEvent[] = bookingsArray.map((b) => {
      const start = toCzechISO(b.start ?? b.finish ?? b.end);
      const end = toCzechISO(b.finish ?? b.end ?? b.start);

      return {
        id: b.id,
        title: b.full_name?.trim() || "Neznámý pacient",
        start,
        end,
        allDay: false,
        type: "booked",
        details: {
          Jméno: b.full_name || "",
          "Datum narození": b.field_1 || "",
          Pohlaví: b.field_2_r || "",
          Mobil: b.mobile || "",
          Email: b.email || "",
          Vyšetření: b.field_1_r || "",
          "Typ služby": b.service_name || "",
        },
      };
    });

    console.log(`✅ ${mapped.length} rezervací (${fromISO} → ${toISO})`);
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("💥 Server error:", error);
    return NextResponse.json(
      { error: "Server error při načítání kalendáře" },
      { status: 500 }
    );
  }
}

/**
 * POST – nová objednávka (NewBooking, JSON). Jen povolené kalendáře (lib/supersaas/server.ts writeBlocked).
 * Do SuperSaaS jdou jen pole, která kalendář má; obsazený čas / chybějící pole vrátí SuperSaaS česky (422).
 */
export async function POST(req: Request) {
  let b: NewBooking;
  try {
    b = (await req.json()) as NewBooking;
  } catch {
    return NextResponse.json({ error: "Neplatná data" }, { status: 400 });
  }
  const scheduleId = Number(b.schedule_id);
  const blocked = writeBlocked(scheduleId);
  if (blocked) return NextResponse.json({ error: blocked, locked: true }, { status: 423 });
  if (!b.full_name?.trim() || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(b.start ?? "") || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(b.finish ?? "")) {
    return NextResponse.json({ error: "Chybí jméno nebo čas objednávky" }, { status: 400 });
  }
  const cal = calendarById(scheduleId)!;
  const form = new URLSearchParams({ "booking[start]": b.start, "booking[finish]": b.finish, "booking[full_name]": b.full_name.trim() });
  if (b.mobile?.trim()) form.set("booking[mobile]", b.mobile.trim());
  if (b.email?.trim()) form.set("booking[email]", b.email.trim());
  for (const f of cal.fields) {
    const v = b[f]?.trim();
    if (v) form.set(`booking[${f}]`, v);
  }

  if (DEMO_MODE) {
    const r = demoCreateBooking(scheduleId, Object.fromEntries(form));
    return "error" in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r, { status: 201 });
  }
  const auth = ssAuth();
  if (!auth) return NextResponse.json({ error: "SuperSaaS není nastavený (.env.local)" }, { status: 500 });
  const r = await fetch(`${SS_BASE}/bookings.json?schedule_id=${scheduleId}`, {
    method: "POST",
    headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  if (r.status !== 201) return NextResponse.json({ error: await ssError(r) }, { status: r.status === 422 ? 422 : 502 });
  // SuperSaaS vrací adresu nové objednávky v Location: …/bookings/{id}.json
  const id = Number(r.headers.get("location")?.match(/bookings\/(\d+)/)?.[1]) || null;
  console.log(`📅 nová objednávka ${id} v kalendáři ${scheduleId}`);
  return NextResponse.json({ id }, { status: 201 });
}
