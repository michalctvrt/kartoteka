"use client";

/**
 * Přihlášený uživatel a jeho oprávnění pro celou aplikaci.
 *
 * ZATÍM SIMULACE: uživatel se vybere v /login a uloží do localStorage.
 * Po načtení se jeho role ověří proti seznamu zaměstnanců (změna role nebo
 * deaktivace v administraci se tak projeví hned). Až bude backend (GET /me),
 * nahradí se jen `signIn`/načtení – zbytek aplikace volá useSession().
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Employee } from "@/lib/auth/types";
import { canVisit as canVisitPath, effectiveCaps, ROLE_HOME, type Capability, type Role } from "@/lib/auth/roles";
import { staffApi } from "@/lib/auth/staffApi";

const KEY = "kartoteka_session_v1";
const EVENT = "kartoteka-session";

type Session = {
  ready: boolean; // false = ještě nevíme (SSR / první vykreslení)
  user: Employee | null;
  roles: Role[];
  /** skutečná oprávnění = role + výjimky nastavené adminem */
  caps: ReadonlySet<Capability>;
  can: (cap: Capability) => boolean;
  canVisit: (path: string) => boolean;
  home: string;
  signIn: (e: Employee) => void;
  signOut: () => void;
};

const Ctx = createContext<Session | null>(null);

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function save(e: Employee | null) {
  try {
    if (e) localStorage.setItem(KEY, JSON.stringify(e));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function SessionProvider({ children }: { children: ReactNode }) {
  // undefined = server (ještě nevíme), null = nepřihlášen
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  const user = useMemo<Employee | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Employee;
    } catch {
      return null;
    }
  }, [raw]);

  // ověřit role/aktivitu proti aktuálnímu seznamu zaměstnanců
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    staffApi
      .list()
      .then((list) => {
        const fresh = list.find((e) => e.id === userId);
        if (!fresh || !fresh.active) save(null);
        else if (JSON.stringify(fresh) !== readRaw()) save(fresh);
      })
      .catch(() => {});
  }, [userId]);

  const signIn = useCallback((e: Employee) => save(e), []);
  const signOut = useCallback(() => save(null), []);

  const value = useMemo<Session>(() => {
    const roles = user?.roles ?? [];
    const caps = effectiveCaps(user);
    return {
      ready: raw !== undefined,
      user,
      roles,
      caps,
      can: (cap) => caps.has(cap),
      canVisit: (path) => canVisitPath(roles, caps, path),
      home: roles[0] ? ROLE_HOME[roles[0]] : "/login",
      signIn,
      signOut,
    };
  }, [raw, user, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession mimo SessionProvider");
  return s;
}

/** Vykreslí obsah jen s oprávněním (tlačítka, sekce). */
export function Can({ cap, children, fallback = null }: { cap: Capability; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return <>{can(cap) ? children : fallback}</>;
}
