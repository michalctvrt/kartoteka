"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PatientService } from "@/lib/api/generated/services/PatientService";

export default function NewPatientBox() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, "").replace("/", "");

  const isRc = (s: string) => /^\d{9,10}$/.test(s);

  const handleSubmit = async () => {
    setError(null);
    const input = normalize(value);

    if (!input) {
      setError("Zadej rodné číslo nebo ID e-žádanky.");
      return;
    }

    setLoading(true);

    try {
      // ==========================
      // 🧍‍♂️ RODNÉ ČÍSLO
      // ==========================
      if (isRc(input)) {
        try {
          await PatientService.findByPid(input);
          router.push(`/reception/patients/${input}`);
        } catch {
          router.push(`/reception/patients/new?rc=${input}`);
        }
        return;
      }

      // ==========================
      // 📄 E-ŽÁDANKA
      // ==========================
      const res = await fetch(`/api/ezadanka/${input}`);

      if (!res.ok) {
        throw new Error("E-žádanka nenalezena.");
      }

      const data = await res.json();
      const rc = normalize(data.pacient?.rodneCislo ?? "");

      if (!rc) {
        throw new Error("E-žádanka neobsahuje rodné číslo.");
      }

      try {
        await PatientService.findByPid(rc);
        router.push(`/reception/patients/${rc}?ezadanka=${input}`);
      } catch {
        router.push(
          `/reception/patients/new?rc=${rc}&ezadanka=${input}`
        );
      }
    } catch (e: any) {
      setError(e.message ?? "Chyba při zpracování.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Rodné číslo nebo ID e-žádanky"
          className="border rounded-md px-3 py-2 text-sm w-full"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {loading ? "Kontroluji…" : "Vyhledat"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-[11px] text-gray-500">
        Rodné číslo nebo QR kód e-žádanky.
      </p>
    </div>
  );
}
