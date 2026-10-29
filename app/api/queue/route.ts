/**
 * GET /api/queue?serviceId=A1,A2  → seznam lístků (víc činností oddělit čárkou)
 */
import { NextRequest } from "next/server";
import { call250v } from "@/lib/call250v/server";
import { handle } from "@/lib/call250v/route-utils";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("serviceId") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return handle(async () => {
    if (ids.length === 0) return call250v.list();
    const lists = await Promise.all(ids.map((id) => call250v.list(id)));
    return lists.flat();
  });
}
