/** PATCH /api/queue/{id}  { serviceId?, externalIdentifier?, name?, note? } → přeřazení / propojení */
import { NextRequest } from "next/server";
import { call250v } from "@/lib/call250v/server";
import { Call250VError } from "@/lib/call250v/errors";
import { handle, operatorFrom, readJson } from "@/lib/call250v/route-utils";
import type { PatchQueueItemRequest } from "@/lib/call250v/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readJson<PatchQueueItemRequest>(req);
  return handle(async () => {
    if (!body.serviceId && body.externalIdentifier === undefined && body.name === undefined && body.note === undefined)
      throw new Call250VError(400, "PATCH potřebuje aspoň serviceId, externalIdentifier, name nebo note.");
    return call250v.patch(id, body, operatorFrom(req));
  });
}
