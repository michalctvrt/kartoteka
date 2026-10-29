"use client";

import { useEffect, useState } from "react";
import { PatientService } from "@/lib/api/generated/services/PatientService";

/**
 * Dohledá jména pacientů v kartotéce podle RČ (best-effort).
 * Cache je sdílená pro celou stránku, takže se každé RČ načte jen jednou.
 */
const cache = new Map<string, Promise<string>>();

function loadName(pid: string): Promise<string> {
  let p = cache.get(pid);
  if (!p) {
    p = PatientService.findByPid(pid)
      .then((r) => {
        const d = r.patientDataInfo;
        return (d && `${d.lastName ?? ""} ${d.firstName ?? ""}`.trim()) || pid;
      })
      .catch(() => {
        cache.delete(pid); // zkusit znovu při dalším načtení
        return pid;
      });
    cache.set(pid, p);
  }
  return p;
}

export function usePatientNames(pids: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(pids)].sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const list = key.split(",");
    Promise.all(list.map(async (pid) => [pid, await loadName(pid)] as const)).then(
      (pairs) => {
        if (!cancelled) setNames((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  return names;
}
