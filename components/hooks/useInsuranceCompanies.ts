"use client";

/**
 * Seznam pojišťoven pro rozbalovací výběr (GET /insurance-company).
 * Načte se jednou za běh stránky a sdílí se mezi komponentami.
 */
import { useEffect, useState } from "react";
import { InsuranceCompanyService } from "@/lib/api/generated/services/InsuranceCompanyService";
import type { InsuranceCompanyInfo } from "@/lib/api/generated/models/InsuranceCompanyInfo";

let cache: Promise<InsuranceCompanyInfo[]> | null = null;

export function useInsuranceCompanies() {
  const [list, setList] = useState<InsuranceCompanyInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    cache ??= InsuranceCompanyService.list().catch((e) => {
      cache = null; // při chybě zkusit příště znovu
      throw e;
    });
    cache
      .then((l) => !cancelled && setList([...l].sort((a, b) => a.id.localeCompare(b.id))))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return list;
}

/**
 * Volby pro <select>: prázdná volba + pojišťovny.
 * Když aktuální kód v seznamu není (nebo se seznam nenačetl), přidá ho,
 * aby se hodnota při uložení neztratila.
 */
export function insuranceOptions(list: InsuranceCompanyInfo[], current: string) {
  const opts = [
    { value: "", label: "— vyberte pojišťovnu —" },
    ...list.map((i) => ({ value: i.id, label: `${i.id} – ${i.description}` })),
  ];
  if (current && !list.some((i) => i.id === current)) {
    opts.push({ value: current, label: current });
  }
  return opts;
}
