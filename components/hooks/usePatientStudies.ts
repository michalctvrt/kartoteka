"use client";

/** Studie pacienta (nejnovější první) – sdílí souhrnná dlaždice i seznam na kartě. */

import { useEffect, useState } from "react";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { apiErrorText } from "@/lib/study/lookups";

export function usePatientStudies(pid: string) {
  const [state, setState] = useState<{ pid: string; studies: StudyInfo[]; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    StudyService.search4({
      searchFilter: { pid },
      orderByFilter: { column: "studyDate", desc: true },
      limitFilter: { first: 0, count: 500 },
    })
      .then((res) => !cancelled && setState({ pid, studies: res.data ?? [], error: null }))
      .catch((e) => !cancelled && setState({ pid, studies: [], error: apiErrorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [pid]);

  const current = state?.pid === pid ? state : null;
  return {
    studies: current?.studies ?? [],
    loading: !current,
    error: current?.error ?? null,
  };
}
