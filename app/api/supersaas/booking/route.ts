import { NextResponse } from "next/server";

// 🔐 Credentials se čtou z .env.local (NEVER commit)
const ACCOUNT_NAME = process.env.SUPERSAAS_USER;
const API_KEY = process.env.SUPERSAAS_API_KEY;
const BASE_URL = "https://www.supersaas.com/api";
const SCHEDULE_ID = 268518; // UZ Vídeňská — TODO: vytáhnout do config (multi-pobočka)

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
  if (!ACCOUNT_NAME || !API_KEY) {
    console.error(
      "❌ Chybí SUPERSAAS_USER nebo SUPERSAAS_API_KEY v .env.local"
    );
    return NextResponse.json(
      { error: "SuperSaaS credentials nejsou nakonfigurované" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("schedule_id") ?? String(SCHEDULE_ID);

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
      return NextResponse.json([], { status: 200 });
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
