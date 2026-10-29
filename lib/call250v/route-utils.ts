import { NextRequest, NextResponse } from "next/server";
import { Call250VError } from "./errors";

/** ID operátora posílá pracoviště v hlavičce (nastavení u fronty). */
export function operatorFrom(req: NextRequest): string | undefined {
  return req.headers.get("x-operator-id")?.trim() || undefined;
}

/** Obalí handler: chyby Call250V vrátí jako JSON { error } se stejným kódem. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return data === undefined
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(data);
  } catch (e) {
    const status = e instanceof Call250VError ? e.status : 500;
    const error = (e as Error).message ?? "Neznámá chyba";
    console.error("[call250v]", status, error);
    // 404 z Call250V = server nedostupný → ven posíláme 503, ať se to neplete
    return NextResponse.json({ error }, { status: status === 404 ? 503 : status });
  }
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
