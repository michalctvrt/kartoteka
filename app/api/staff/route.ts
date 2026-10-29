/**
 * SIMULACE správy zaměstnanců (GET seznam, POST nový). Kontrakt: lib/auth/types.ts.
 * V produkci ji nahradí backend – frontend volá jen lib/auth/staffApi.ts.
 */
import { NextResponse } from "next/server";
import { createStaff, listStaff } from "@/lib/auth/staffStore";
import type { EmployeeInput } from "@/lib/auth/types";

export async function GET() {
  return NextResponse.json(await listStaff());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EmployeeInput;
    return NextResponse.json(await createStaff(body), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
