/**
 * Volání provozních funkcí (převzatých z /opt/testapp) z prohlížeče – přes bránu /api/ops.
 */

export type InsuranceResult =
  | { status: "insured"; code: string; name: string }
  | { status: "uninsured" }
  | { status: "unknown"; error?: string };

/** Stav pojištění k datu (registr pojištěnců, stejná služba jako v testappu). */
export async function checkInsurance(pid: string, date: string): Promise<InsuranceResult> {
  try {
    const res = await fetch("/api/ops/vzp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cisloPojistence: pid, datum: date }),
    });
    const d = (await res.json()) as { stav?: string; kodPojistovny?: string; nazevPojistovny?: string; error?: string };
    if (d.stav === "pojisten") return { status: "insured", code: d.kodPojistovny ?? "", name: d.nazevPojistovny ?? "" };
    if (d.stav === "nepojisten") return { status: "uninsured" };
    return { status: "unknown", error: d.error };
  } catch (e) {
    return { status: "unknown", error: (e as Error).message };
  }
}

/** Prodlouží online přístup ke zprávě o `days` dní od dneška. ZÁPIS do databáze kartotéky. */
export async function extendRemoteAccess(uid: string, days = 3): Promise<{ until: string }> {
  const res = await fetch("/api/ops/extend-validity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uid, days }),
  });
  const d = (await res.json()) as { success?: boolean; new_valid_until?: string; error?: string };
  if (!res.ok || !d.success) throw new Error(d.error ?? `Chyba ${res.status}`);
  return { until: d.new_valid_until ?? "" };
}
