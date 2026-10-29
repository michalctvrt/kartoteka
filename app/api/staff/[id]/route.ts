/** SIMULACE úpravy zaměstnance (PATCH). Kontrakt: lib/auth/types.ts. */
import { NextResponse } from "next/server";
import { updateStaff } from "@/lib/auth/staffStore";
import type { EmployeeInput } from "@/lib/auth/types";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const patch = (await req.json()) as Partial<EmployeeInput>;
    const e = await updateStaff(id, patch);
    if (!e) return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
    return NextResponse.json(e);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
