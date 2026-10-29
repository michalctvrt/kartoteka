/** SIMULACE: úprava (PUT) a smazání (DELETE) šablony popisu. */
import { NextResponse } from "next/server";
import { deleteTemplate, updateTemplate } from "@/lib/templates/store";
import type { TemplateInput } from "@/lib/templates/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const t = await updateTemplate(id, (await req.json()) as Partial<TemplateInput>);
    return t ? NextResponse.json(t) : NextResponse.json({ error: "Šablona neexistuje" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (await deleteTemplate(id)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Šablona neexistuje" }, { status: 404 });
}
