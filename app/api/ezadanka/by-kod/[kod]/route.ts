/**
 * Mock endpoint pro detail jedné eŽádanky podle kódu.
 *
 * Až Václav dodá Java endpoint `/CardFileWebWS/rest/ezadanka/by-kod/{kod}`,
 * tento mock se nahradí buď proxy routou nebo voláním přes generated klienta.
 *
 * Strukturu odpovědi viz `lib/ezadanka/types.ts` → ZadankaDetail.
 */

import { NextResponse } from "next/server";
import { MOCK_DETAILS } from "@/lib/ezadanka/mock-data";
import type {
  EzadankaErrorResponse,
  ZadankaDetail,
} from "@/lib/ezadanka/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ kod: string }> }
) {
  const { kod } = await ctx.params;
  const detail: ZadankaDetail | undefined = MOCK_DETAILS[kod.toUpperCase()];

  // Simulace lehkého zpoždění
  await new Promise((r) => setTimeout(r, 200));

  if (!detail) {
    const err: EzadankaErrorResponse = {
      error: `eŽádanka s kódem "${kod}" nenalezena.`,
    };
    return NextResponse.json(err, { status: 404 });
  }

  return NextResponse.json(detail);
}
