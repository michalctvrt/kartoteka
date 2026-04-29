/**
 * Mock endpoint pro vyhledávání aktivních eŽádanek podle RČ.
 *
 * Až Václav dodá Java endpoint `/CardFileWebWS/rest/ezadanka/by-rid/{rid}`,
 * tento mock se nahradí buď proxy routou (forward na backend) nebo volání
 * z generated klienta. Frontend voláme stejně, takže UI se nedotkne.
 *
 * Strukturu odpovědi viz `lib/ezadanka/types.ts` → SearchByRidResponse.
 */

import { NextResponse } from "next/server";
import { MOCK_LIST_ITEMS } from "@/lib/ezadanka/mock-data";
import type { SearchByRidResponse } from "@/lib/ezadanka/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ rid: string }> }
) {
  const { rid } = await ctx.params;
  const normalized = rid.replace(/\s+/g, "").replace("/", "");

  const items = MOCK_LIST_ITEMS[normalized] ?? [];

  // Simulace lehkého zpoždění, ať vidíme loading state v UI
  await new Promise((r) => setTimeout(r, 200));

  const body: SearchByRidResponse = {
    totalCount: items.length,
    pocetVrazenych: items.length,
    pageNumber: 1,
    pageCount: 1,
    zadanky: items,
  };

  return NextResponse.json(body);
}
