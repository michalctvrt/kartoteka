/** GET /api/queue/config → konfigurace Call250V + příznak, jestli běží simulátor */
import { call250v, isMock } from "@/lib/call250v/server";
import { handle } from "@/lib/call250v/route-utils";

export async function GET() {
  return handle(async () => ({ mock: isMock, ...(await call250v.getConfig()) }));
}
