/**
 * Ověření pojištění – volání služby registru pojištěnců ze serveru (jen server).
 *
 * Konfigurace v .env.local (adresy se do gitu nedávají):
 *   VZP_API_URL       adresa služby (stejná, jakou volá provozní aplikace)
 *   VZP_CONNECT_HOST  volitelně: kam se reálně připojit (např. 127.0.0.1, když služba běží na tomto
 *                     serveru a veřejné jméno zevnitř nejde); certifikát se dál ověřuje podle jména z URL
 *   VZP_EXTRA_CA      volitelně: PEM s mezilehlým certifikátem, který server služby neposílá
 *                     (výchozí certs/certum-ov-tls-g2-r39.pem – veřejný certifikát Certum)
 * Ověřování certifikátu se NEVYPÍNÁ.
 */

import https from "node:https";
import tls from "node:tls";
import { readFileSync } from "node:fs";
import path from "node:path";

let extraCa: string | null | undefined;
function ca(): string[] {
  if (extraCa === undefined) {
    try {
      extraCa = readFileSync(path.resolve(process.cwd(), process.env.VZP_EXTRA_CA ?? "certs/certum-ov-tls-g2-r39.pem"), "utf8");
    } catch {
      extraCa = null;
    }
  }
  return extraCa ? [...tls.rootCertificates, extraCa] : [...tls.rootCertificates];
}

export async function callVzp(body: string): Promise<{ status: number; text: string }> {
  const raw = process.env.VZP_API_URL;
  if (!raw) return { status: 500, text: JSON.stringify({ error: "VZP_API_URL není nastavené v .env.local" }) };
  const url = new URL(raw);
  const connectHost = process.env.VZP_CONNECT_HOST;

  return new Promise((resolve) => {
    const req = https.request(
      {
        method: "POST",
        host: connectHost || url.hostname,
        servername: url.hostname, // certifikát se ověřuje proti jménu z URL
        port: url.port || 443,
        path: url.pathname + url.search,
        headers: { "content-type": "application/json", host: url.host, "content-length": Buffer.byteLength(body) },
        ca: ca(),
        timeout: 15_000,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 502, text }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("vypršel čas spojení")));
    req.on("error", (e) => resolve({ status: 502, text: JSON.stringify({ error: `Služba ověření pojištění nedostupná: ${e.message}` }) }));
    req.end(body);
  });
}
