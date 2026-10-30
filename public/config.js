/*
 * Nastavení této instalace kartotéky (pobočky). Načítá se před aplikací.
 * Ve vývoji může zůstat prázdné – platí hodnoty z .env.local.
 * Vzor pro produkci (statický web v EARu) – viz docs/PRODUKCE.md:
 *
 *   window.__KARTOTEKA__ = {
 *     apiBase: "/CardFileWebWS/rest",
 *     bridgeBase: "/CardFileWebWS/rest/m",
 *     legacyBaseUrl: "",
 *     workingplace: "OLOM",
 *     studyViaApi: false,
 *     studyEditViaApi: false,
 *   };
 */
window.__KARTOTEKA__ = window.__KARTOTEKA__ || {};
