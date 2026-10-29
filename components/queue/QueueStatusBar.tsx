"use client";

/**
 * Lišta v hlavičce aplikace: kolik pacientů kde čeká. Je vidět na každé
 * stránce, obnovuje se každé 3 s a bliká, když někdo čeká.
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
    <Link href={boardHref} className="flex items-center gap-1.5 text-sm" title="Čekající pacienti">
      <span className="text-gray-500 dark:text-gray-400 mr-1 hidden sm:inline">Čeká:</span>
      {counts.map(({ m, n }) => (
        <span
          key={m}
          className={cn(
            "px-2.5 py-1 rounded-md font-semibold",
            n > 0 ? MODALITY_STYLE[m].header : "bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-gray-400",
            n > 0 && "animate-pulse"
          )}
        >
          {m} {n}
        </span>
      ))}
      <span
        className={cn(
          "px-2.5 py-1 rounded-md font-semibold",
          reception > 0
            ? "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900"
            : "bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-gray-400"
        )}
      >
        Recepce {reception}
      </span>
    </Link>
  );
}
