/**
 * SIMULACE šablon popisu (GET seznam, POST nová). Kontrakt: lib/templates/types.ts.
 * V produkci nahradí backend (study_description_template) – frontend volá jen lib/templates/api.ts.
 */
import { NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/lib/templates/store";
import type { TemplateInput } from "@/lib/templates/types";

export async function GET() {
  return NextResponse.json(await listTemplates());
}

export async function POST(req: Request) {
  try {
    return NextResponse.json(await createTemplate((await req.json()) as TemplateInput), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
