import * as React from "react"

import { cn } from "@/lib/utils"

/** Nízkokontrastní pulzující zástupce obsahu při načítání (bez textu). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-ui-raised motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

/**
 * Prázdný stav: stejný tvar jako skeleton, ale v klidu (nepulzuje),
 * aby nevypadal jako „pořád se načítá“. Pro čtečky nese text v `label`.
 */
function Ghost({ className, label, ...props }: React.HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <div role="status" className={cn("relative", className)} {...props}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="space-y-2.5 opacity-70">
        <div className="h-3 w-2/5 rounded bg-ui-raised" />
        <div className="h-3 w-3/5 rounded bg-ui-raised" />
        <div className="h-3 w-1/4 rounded bg-ui-raised" />
      </div>
    </div>
  )
}

export { Skeleton, Ghost }
