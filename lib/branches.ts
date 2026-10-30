"use client";

/**
 * Víc poboček v jedné kartotéce. Lékařka po zavírací době popisuje studie jiné pobočky – místo zavírání
 * a přihlašování do kartotéky jiné pobočky jen přepne pobočku (nebo otevře studii ze seznamu K popisu).
 *
 *   – Seznam poboček je v config.js (`branches`, lib/runtimeConfig.ts). Bez něj = jen tato pobočka (jako dřív).
 *   – Prohlížeč volá VŽDY jen svůj server: apiBase cizí pobočky je cesta na vlastním serveru, kterou Václavův
 *     most předá serveru té pobočky (přihlášení zůstane jedno – docs/POBOCKY.md). Adresy serverů nikdy do gitu.
 *   – Popisy se zapisují na server pobočky, kam studie patří (lokál – kvůli výpadkům), ne přes centrál.
 *   – Přepíná se jen kartotéka (pacienti, studie, popisy, stará kartotéka). Vyvolávací systém, objednávky
 *     a ostatní mosty zůstávají na této pobočce.
 *
 * Aktivní pobočka: localStorage (per prohlížeč) → OpenAPI.BASE. Po přepnutí se obsah stránky načte znovu
 * (layout má key = pobočka).
 */

import { useSyncExternalStore } from "react";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import { runtimeConfig, type BranchConfig } from "@/lib/runtimeConfig";

export type Branch = BranchConfig;

/** Pobočky z config.js; bez seznamu jediná „tato pobočka“. */
export const BRANCHES: Branch[] = runtimeConfig.branches?.length
  ? runtimeConfig.branches
  : [{ code: "LOCAL", name: "", apiBase: runtimeConfig.apiBase }];

export const LOCAL_BRANCH: Branch = BRANCHES.find((b) => b.code === runtimeConfig.localBranch) ?? BRANCHES[0];
export const MULTI_BRANCH = BRANCHES.length > 1;

export const branchByCode = (code?: string | null) => BRANCHES.find((b) => b.code === code);

const KEY = "kartoteka_branch";
const EVENT = "kartoteka-branch";

function readCode(): string {
  try {
    const c = localStorage.getItem(KEY);
    return branchByCode(c) ? c! : LOCAL_BRANCH.code;
  } catch {
    return LOCAL_BRANCH.code;
  }
}

/** Aktivní pobočka (mimo React – pro odkazy do staré kartotéky apod.). */
export function activeBranch(): Branch {
  return typeof window === "undefined" ? LOCAL_BRANCH : branchByCode(readCode()) ?? LOCAL_BRANCH;
}

// hned při načtení: API míří na naposledy zvolenou pobočku
if (typeof window !== "undefined") OpenAPI.BASE = activeBranch().apiBase;

/** Přepnout pobočku (API + uložit + dát vědět všem, kdo poslouchají). */
export function setActiveBranch(code: string) {
  const b = branchByCode(code) ?? LOCAL_BRANCH;
  try {
    localStorage.setItem(KEY, b.code);
  } catch {}
  OpenAPI.BASE = b.apiBase;
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

export function useActiveBranch(): Branch {
  const code = useSyncExternalStore(subscribe, readCode, () => LOCAL_BRANCH.code);
  return branchByCode(code) ?? LOCAL_BRANCH;
}
