/** POST /api/queue/{id}/call  { counter } → vyvolá konkrétního pacienta (i znovu) */
import { NextRequest } from "next/server";
import { call250v } from "@/lib/call250v/server";
import { Call250VError } from "@/lib/call250v/errors";
import { handle, operatorFrom, readJson } from "@/lib/call250v/route-utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { counter } = await readJson<{ counter?: string }>(req);
  return handle(async () => {
    if (!counter) throw new Call250VError(400, "Chybí counter (pult/dveře).");
    return call250v.call(id, counter, operatorFrom(req));
  });
}
