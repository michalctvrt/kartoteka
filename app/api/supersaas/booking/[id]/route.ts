/** DELETE /api/supersaas/booking/{id}?schedule_id=… – zrušení objednávky (jen povolené kalendáře). */
import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoDeleteBooking } from "@/lib/demo/bookings";
import { SS_BASE, ssAuth, ssError, writeBlocked } from "@/lib/supersaas/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scheduleId = Number(new URL(req.url).searchParams.get("schedule_id"));
  const blocked = writeBlocked(scheduleId);
  if (blocked) return NextResponse.json({ error: blocked, locked: true }, { status: 423 });
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Neplatné číslo objednávky" }, { status: 400 });

  if (DEMO_MODE) return demoDeleteBooking(scheduleId, Number(id)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Objednávka neexistuje" }, { status: 404 });
  const auth = ssAuth();
  if (!auth) return NextResponse.json({ error: "SuperSaaS není nastavený (.env.local)" }, { status: 500 });
  // POZOR: SuperSaaS potřebuje i schedule_id, jinak 404 (ověřeno 2026-10-30)
  const r = await fetch(`${SS_BASE}/bookings/${id}.json?schedule_id=${scheduleId}`, {
    method: "DELETE",
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: await ssError(r) }, { status: r.status === 404 ? 404 : 502 });
  console.log(`📅 zrušena objednávka ${id} v kalendáři ${scheduleId}`);
  return new NextResponse(null, { status: 204 });
}
