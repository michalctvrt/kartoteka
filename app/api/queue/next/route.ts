/** POST /api/queue/next  { counter, serviceId? } → vyvolá dalšího čekajícího */
import { NextRequest } from "next/server";
import { call250v } from "@/lib/call250v/server";
import { Call250VError } from "@/lib/call250v/errors";
import { handle, operatorFrom, readJson } from "@/lib/call250v/route-utils";

export async function POST(req: NextRequest) {
  const { counter, serviceId } = await readJson<{ counter?: string; serviceId?: string }>(req);
  return handle(async () => {
    if (!counter) throw new Call250VError(400, "Chybí counter (pult/dveře).");
    return call250v.next(counter, operatorFrom(req), serviceId);
  });
}
