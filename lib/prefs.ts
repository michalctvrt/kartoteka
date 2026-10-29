"use client";

/**
 * Osobní nastavení vzhledu v tomto prohlížeči (Nastavení → Vzhled):
 *   theme  – světlý / tmavý / podle systému
 *   motion – plné animace / omezené (bez pohybu a přechodů)
 * Sdílené mezi komponentami i záložkami (useSyncExternalStore).
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export type MotionPref = "full" | "reduced";
export type Prefs = { theme: ThemePref; motion: MotionPref };

const KEY = "kartoteka_prefs_v1";
const EVENT = "kartoteka-prefs";
const DEFAULTS: Prefs = { theme: "light", motion: "full" };

function read(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return raw;
    // dřívější přepínač ukládal jen "theme"
    const old = localStorage.getItem("theme");
    return old === "dark" || old === "light" ? JSON.stringify({ ...DEFAULTS, theme: old }) : "";
  } catch {
    return "";
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function usePrefs() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const prefs = useMemo<Prefs>(() => {
    try {
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }, [raw]);

  const update = useCallback(
    (patch: Partial<Prefs>) => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...prefs, ...patch }));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [prefs]
  );

  // „podle systému“ → sledovat nastavení operačního systému
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const dark = prefs.theme === "dark" || (prefs.theme === "system" && systemDark);
  return { prefs, update, dark };
}
