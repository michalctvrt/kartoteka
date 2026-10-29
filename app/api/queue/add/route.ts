/**
 * POST /api/queue/add  { serviceId, printTicket? }
 * Na Olomoucké lístky tiskne kiosk sám — tohle se použije jen v simulaci
 * (tlačítka „kiosk“) nebo pro ruční zařazení pacienta recepcí.
 */
import { NextRequest } from "next/server";
import { call250v } from "@/lib/call250v/server";
import { handle, readJson } from "@/lib/call250v/route-utils";
import type { AddToServiceRequest } from "@/lib/call250v/types";

export async function POST(req: NextRequest) {
  const body = await readJson<AddToServiceRequest>(req);
  return handle(() => call250v.addToService(body));
}
