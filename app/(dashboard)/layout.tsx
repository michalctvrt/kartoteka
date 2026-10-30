"use client";

/**
 * Shell aplikace – styl „rám a list“:
 *   rám (menu vlevo + 48px lišta nahoře) = jeden tónovaný podklad bez linky,
 *   obsah = bílý list odsazený 8px od pravého a spodního okraje, 16px rohy, bez stínu.
 * Na telefonu/tabletu (< 1024px) se menu schová za tlačítko v liště.
 */

import QueueStatusBar from "@/components/queue/QueueStatusBar";
import AppNav from "@/components/AppNav";
import { useSession } from "@/components/auth/SessionProvider";
import { ROLE_HOME, ROLE_NAME, workspaceOf } from "@/lib/auth/roles";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MotionConfig } from "framer-motion";
import { usePrefs } from "@/lib/prefs";
import { usePath } from "@/lib/routes";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePath();
  const router = useRouter();
  const { ready, user, roles, canVisit, home } = useSession();
  const fromPath = workspaceOf(pathname);
  const ws = fromPath && canVisit(ROLE_HOME[fromPath]) ? fromPath : roles[0];
  const [menuOpen, setMenuOpen] = useState(false);

  // nepřihlášený → přihlášení
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // Vzhled z Nastavení (lib/prefs.ts): téma + omezení animací.
  // Na serveru vždy světlé – třída se doplní až na klientovi (žádný hydration mismatch).
  const { prefs, update: updatePrefs, dark } = usePrefs();
  const theme: "light" | "dark" = dark ? "dark" : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset.motion = prefs.motion;
  }, [dark, prefs.motion]);

  // rychlý přepínač v menu: vždy na opačné téma (zruší „podle systému“)
  const toggleTheme = () => updatePrefs({ theme: dark ? "light" : "dark" });

  const boardHref = ws === "doctor" ? "/doctor" : ws === "lab" ? "/lab" : "/reception";
  const allowed = canVisit(pathname);

  return (
    // „user“ = podle systému; „always“ = v Nastavení zvoleno Omezené animace
    <MotionConfig reducedMotion={prefs.motion === "reduced" ? "always" : "user"}>
    <div className="flex min-h-screen bg-ui-frame text-ui-ink">
      {/* MENU – desktop */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 lg:block">
        <AppNav theme={theme} onToggleTheme={toggleTheme} />
      </aside>

      {/* MENU – telefon/tablet: celá obrazovka */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ui-frame lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute right-3 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-active"
            aria-label="Zavřít menu"
          >
            <X className="h-5 w-5" />
          </button>
          <AppNav theme={theme} onToggleTheme={toggleTheme} onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* LIŠTA – na podkladu rámu, bez linky */}
        <header className="flex h-12 shrink-0 items-center gap-3 px-4 lg:pl-1 lg:pr-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-active lg:hidden"
            aria-label="Otevřít menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-ui-ink lg:hidden">{ws ? ROLE_NAME[ws] : ""}</span>
          {/* Vyvolávací systém: kolik kde čeká — vidět na každé stránce */}
          <div className="ml-auto">
            <QueueStatusBar boardHref={boardHref} />
          </div>
        </header>

        {/* LIST */}
        <main className="mx-2 mb-2 min-w-0 flex-1 rounded-2xl border border-ui-line bg-ui-sheet p-4 sm:p-6 lg:ml-0">
          {!ready || !user ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : allowed ? (
            children
          ) : (
            <Forbidden home={home} />
          )}
        </main>
      </div>
    </div>
    </MotionConfig>
  );
}

/** Stránka, na kterou role nesmí (např. laborant → nový pacient). */
function Forbidden({ home }: { home: string }) {
  return (
    <div className="ui-tile mx-auto mt-10 max-w-md p-6 text-center">
      <ShieldOff className="mx-auto h-6 w-6 text-ui-faint" />
      <h1 className="mt-3 text-lg font-semibold">Sem nemáte přístup</h1>
      <p className="mt-1 text-sm text-ui-muted">Vaše role tuto část kartotéky nepoužívá. Pokud ji potřebujete, požádejte administrátora.</p>
      <Link href={home} className="mt-4 inline-block text-sm text-ui-primary hover:underline">
        Zpět na moji plochu
      </Link>
    </div>
  );
}
