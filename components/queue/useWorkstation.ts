"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { setQueueOperator } from "@/lib/call250v/browser";
import type { Modality } from "@/lib/call250v/config";

/**
 * Nastavení konkrétního počítače: u kterého pultu sedí, jaká modalita,
 * jaké ID operátora v Call250V. Ukládá se v prohlížeči (localStorage),
 * protože patří k pracovišti, ne k pacientovi.
 *
 * Až bude v kartotéce přihlašování, operatorId se vezme z účtu uživatele.
 */
export interface Workstation {
  receptionCounter: string;
  modality: Modality;
  operatorId: string;
}

const KEY = "call250v_workstation_v1";
const DEFAULTS: Workstation = { receptionCounter: "P1", modality: "RTG", operatorId: "" };

const EVENT = "call250v-workstation";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useWorkstation() {
  // Sdílené mezi všemi komponentami na stránce i mezi záložkami prohlížeče
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const ws = useMemo<Workstation>(() => {
    try {
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }, [raw]);

  useEffect(() => {
    setQueueOperator(ws.operatorId);
  }, [ws.operatorId]);

  const update = (patch: Partial<Workstation>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...ws, ...patch }));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return { ws, update };
}
