"use client";

/**
 * Lišta v hlavičce aplikace: kolik pacientů kde čeká. Je vidět na každé
 * stránce a obnovuje se každé 3 s (bez blikání – kouká se na to celý den).
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  MODALITIES,
  RECEPTION_SERVICES,
  WAITING_SERVICES,
} from "@/lib/call250v/config";
import { useQueue } from "./useQueue";
import { MODALITY_STYLE } from "./WaitingBoard";

export default function QueueStatusBar({ boardHref }: { boardHref: string }) {
  const { items, error } = useQueue([], 3000);
  if (error) return null;

  const pending = items.filter((i) => i.status !== "called");
  const counts = MODALITIES.map((m) => ({
    m,
    n: pending.filter((i) => i.serviceId === WAITING_SERVICES[m]).length,
  }));
  const reception = pending.filter((i) => RECEPTION_SERVICES.includes(i.serviceId ?? "")).length;

  return (
    <Link
      href={boardHref}
      className="flex items-center gap-1 rounded-lg px-1 py-1 text-[13px] hover:bg-ui-active/60"
      title="Čekající pacienti – otevřít čekárny"
    >
      <span className="mr-1 hidden text-ui-muted sm:inline">Čeká</span>
      {counts.map(({ m, n }) => (
        <Count key={m} label={m} n={n} tone={MODALITY_STYLE[m].badge} />
      ))}
      <Count label="Recepce" n={reception} tone="bg-ui-active text-ui-ink" />
    </Link>
  );
}

/** Počet čekajících: s někým = světlý podklad modality, prázdno = šedý text. */
function Count({ label, n, tone }: { label: string; n: number; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2",
        n > 0 ? tone : "text-ui-muted"
      )}
    >
      {label}
      <span className={cn("font-semibold", n === 0 && "font-normal")}>{n}</span>
    </span>
  );
}
