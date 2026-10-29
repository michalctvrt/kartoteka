/** POST /api/queue/{id}/complete → lístek končí (až po výdeji zprávy!) */
import { NextRequest } from "next/server";
import { call250v } from "@/lib/call250v/server";
import { handle, operatorFrom } from "@/lib/call250v/route-utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(() => call250v.complete(id, operatorFrom(req)));
}
