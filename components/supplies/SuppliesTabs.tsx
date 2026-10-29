"use client";

/** Záložky spotřebního materiálu (Objednávka · Souhrn · Katalog) podle oprávnění + upozornění na vypnutý zápis. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/SessionProvider";

const TABS = [
  { href: "/supplies", label: "Objednávka", cap: "supplies.order" },
  { href: "/supplies/summary", label: "Souhrn a tisk", cap: "supplies.summary" },
  { href: "/supplies/catalog", label: "Katalog", cap: "supplies.catalog" },
] as const;

export default function SuppliesTabs() {
  const pathname = usePathname();
  const { can } = useSession();
  const tabs = TABS.filter((t) => can(t.cap));
  if (tabs.length < 2) return null;
  return (
    <LayoutGroup id="supplies-tabs">
      <nav aria-label="Spotřební materiál" className="inline-flex h-10 items-center rounded-lg border border-ui-line bg-ui-raised p-0.5">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center rounded-md px-3 text-[13px] transition-colors",
                active ? "font-medium text-ui-ink" : "text-ui-muted hover:text-ui-ink"
              )}
            >
              {active && (
                <motion.span
                  layoutId="supplies-tab"
                  className="ui-press absolute inset-0 rounded-md border border-ui-line bg-ui-sheet"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

/** Ukáže se, když brána vrátí 423 (zápis vypnutý na ostrých datech). */
export function WriteLockedNotice({ what }: { what: string }) {
  return (
    <div className="ui-tile flex items-start gap-3 p-4 text-sm">
      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <div>
        <p className="font-medium">{what} je v Kartotéce zatím jen na ukázku</p>
        <p className="mt-0.5 text-[13px] text-ui-muted">
          Objednávky se dál vyplňují a uzavírají v původní aplikaci – Kartotéka do nich nezapisuje, aby se nic nezměnilo.
          Souhrn s aktuálními objednávkami je vidět v záložce Souhrn a tisk.
        </p>
      </div>
    </div>
  );
}
