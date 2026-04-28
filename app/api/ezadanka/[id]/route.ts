import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // 🔧 MOCK – testovací e-žádanka
  if (id === "ffba88cf-b721-4aff-b7bc-91167899b3bb") {
    return NextResponse.json({
      pacient: {
        rodneCislo: "8001011234",
        jmeno: "Jan",
        prijmeni: "Novák",
        datumNarozeni: "1980-01-01",
        pohlavi: "MALE",
        pojistovna: "111",
        telefon: "+420777123456",
        email: "jan.novak@test.cz",
      },
      ezadankaId: id,
    });
  }

  return NextResponse.json(
    { error: "E-žádanka nenalezena" },
    { status: 404 }
  );
}
