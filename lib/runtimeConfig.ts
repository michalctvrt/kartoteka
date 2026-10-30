/**
 * Nastavení, které se liší podle pobočky / prostředí – čte se ZA BĚHU, ne při sestavení.
 *
 * V produkci je kartotéka statický web v EARu (docs/PRODUKCE.md): jedno sestavení pro všechny pobočky,
 * každá pobočka si upraví jen soubor `config.js` vedle aplikace (vzor public/config.js), který se
 * načte před aplikací a nastaví `window.__KARTOTEKA__`. Co v něm chybí, bere se z .env (vývoj).
 *
 *   apiBase      – REST CardFileWebWS (vývoj: Next proxy /api/cardfile/rest; produkce: /CardFileWebWS/rest)
 *   bridgeBase   – „mosty“ (vyvolávací systém, SuperSaaS, VZP, provozní aplikace, zaměstnanci, šablony…)
 *                  vývoj: Next API routes /api; produkce: Java endpointy se STEJNÝMI podcestami
 *   legacyBaseUrl – kde běží stará kartotéka (prázdné = stejný server)
 *   workingplace  – pracoviště pro nová vyšetření (kód z /workingplace)
 *   studyViaApi / studyEditViaApi – přepínače nových formulářů (čekají na backend)
 */

export type RuntimeConfig = {
  apiBase: string;
  bridgeBase: string;
  legacyBaseUrl: string;
  workingplace: string;
  studyViaApi: boolean;
  studyEditViaApi: boolean;
};

declare global {
  interface Window {
    __KARTOTEKA__?: Partial<RuntimeConfig>;
  }
}

const fromFile: Partial<RuntimeConfig> = (typeof window !== "undefined" && window.__KARTOTEKA__) || {};
const env = process.env;

export const runtimeConfig: RuntimeConfig = {
  apiBase: fromFile.apiBase ?? "/api/cardfile/rest",
  bridgeBase: fromFile.bridgeBase ?? "/api",
  legacyBaseUrl:
    fromFile.legacyBaseUrl ?? env.NEXT_PUBLIC_LEGACY_BASE_URL ?? (env.NODE_ENV === "development" ? "http://localhost:8080" : ""),
  workingplace: fromFile.workingplace ?? env.NEXT_PUBLIC_WORKINGPLACE ?? "",
  studyViaApi: fromFile.studyViaApi ?? env.NEXT_PUBLIC_STUDY_VIA_API === "1",
  studyEditViaApi: fromFile.studyEditViaApi ?? env.NEXT_PUBLIC_STUDY_EDIT_VIA_API === "1",
};

/** Adresa „mostu“: bridge("queue/add") → /api/queue/add (vývoj) nebo <bridgeBase>/queue/add (produkce). */
export const bridge = (path: string) => `${runtimeConfig.bridgeBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

/** Prefix aplikace (např. /CFLocalSyncWeb/m) – pro soubory z public/ mimo <Link>. */
export const BASE_PATH = env.NEXT_PUBLIC_BASE_PATH ?? "";
