/**
 * Je zapnutý demo režim? (server)
 *
 * Odolné proti tomu, jak .env.local vznikne na Windows:
 *   - mezera / uvozovky kolem hodnoty ("DEMO_MODE=1 ", DEMO_MODE="1")
 *   - BOM na začátku souboru z Poznámkového bloku → klíč se jmenuje "﻿DEMO_MODE"
 *   - hodnota true / yes / ano místo 1
 */

const RAW = process.env.DEMO_MODE ?? process.env["﻿DEMO_MODE"];

export const DEMO_MODE = ["1", "true", "yes", "ano", "on"].includes(
  (RAW ?? "").trim().replace(/^["']|["']$/g, "").toLowerCase()
);

/** Co server o demo režimu vidí – do chybové hlášky, ať jde poznat, proč nejede. */
export function demoDiagnosis(): string {
  const keys = Object.keys(process.env).filter((k) => k.toUpperCase().includes("DEMO"));
  if (!keys.length) return "Server nevidí proměnnou DEMO_MODE – chybí soubor .env.local ve složce kartotéky, nebo se jmenuje jinak (např. .env.local.txt).";
  return `Server vidí ${keys.map((k) => `${JSON.stringify(k)}=${JSON.stringify(process.env[k])}`).join(", ")} – pro demo musí být DEMO_MODE=1.`;
}
