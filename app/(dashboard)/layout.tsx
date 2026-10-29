"use client";

/**
 * Shell aplikace – styl „rám a list“:
 *   rám (menu vlevo + 48px lišta nahoře) = jeden tónovaný podklad bez linky,
 *   obsah = bílý list odsazený 8px od pravého a spodního okraje, 16px rohy, bez stínu.
 * Na telefonu/tabletu (< 1024px) se menu schová za tlačítko v liště.
 */

import QueueStatusBar from "@/components/queue/QueueStatusBar";
import AppNav, { ROLE_LABEL, roleFromPath } from "@/components/AppNav";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const role = roleFromPath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  // 🌗 Téma. Server vždy "light" (žádný přístup k localStorage).
  // V useEffect doplníme uloženou hodnotu na klientovi → vyhneme se hydration mismatchi.
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as "light" | "dark" | null;
      if (saved) setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch {}
  };

  const boardHref =
    role === "reception" ? "/reception" : role === "doctor" ? "/doctor" : "/lab";

  return (
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
          <span className="text-sm font-medium text-ui-ink lg:hidden">{ROLE_LABEL[role]}</span>
          {/* Vyvolávací systém: kolik kde čeká — vidět na každé stránce */}
          <div className="ml-auto">
            <QueueStatusBar boardHref={boardHref} />
          </div>
        </header>

        {/* LIST */}
        <main className="mx-2 mb-2 min-w-0 flex-1 rounded-2xl border border-ui-line bg-ui-sheet p-4 sm:p-6 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
