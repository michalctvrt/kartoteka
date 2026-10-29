"use client";

import StudieMenu from "@/components/StudieMenu";
import QueueStatusBar from "@/components/queue/QueueStatusBar";
import PacientiMenu from "@/components/PacientiMenu";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Calendar,
  FlaskConical,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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

  // role podle URL
  const role = pathname.includes("/doctor")
    ? "Lékař"
    : pathname.includes("/lab")
    ? "Laborant"
    : pathname.includes("/reception")
    ? "Recepce"
    : pathname.includes("/admin")
    ? "Administrátor"
    : "Uživatel";

  const handleLogout = () => router.push("/login");

  // menu se speciálními položkami
  const menu = [
    {
      label: "Domů",
      icon: <Home className="w-5 h-5" />,
      href: pathname.includes("/doctor")
        ? "/doctor"
        : pathname.includes("/lab")
        ? "/lab"
        : pathname.includes("/reception")
        ? "/reception"
        : pathname.includes("/admin")
        ? "/admin"
        : "/",
    },

    // Lékař i laborant mají stejné menu (worklist = čekárny RTG/UZ/MRI)
    ...(pathname.includes("/doctor") || pathname.includes("/lab")
      ? [
          {
            label: "Worklist",
            icon: <Calendar className="w-5 h-5" />,
            href: pathname.includes("/lab") ? "/lab/worklist" : "/doctor/worklist",
          },
        ]
      : []),

    ...(pathname.includes("/reception")
      ? [
          {
            label: "Kalendář objednávek",
            icon: <Calendar className="w-5 h-5" />,
            href: "/reception/calendar",
          },
          {
            label: "Pacienti",
            icon: <Users className="w-5 h-5" />,
            href: "/reception/patients",
          },
        ]
      : []),

    // ⭐ Studie – speciální položka s podmenu
    {
      label: "Studie",
      special: "studie-menu",
      icon: <FlaskConical className="w-5 h-5" />,
    },

    {
      label: "Nastavení",
      icon: <Settings className="w-5 h-5" />,
      href: "/settings",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-64 shrink-0 bg-white dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 shadow-sm flex flex-col">
          {/* Logo DC Flipper (v tmavém režimu varianta s bílým textem) */}
          <div className="px-5 py-5 border-b border-gray-200 dark:border-neutral-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="DC Flipper Radiodiagnostika" className="w-full h-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.svg" alt="DC Flipper Radiodiagnostika" className="w-full h-auto hidden dark:block" />
            <div className="mt-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
              Kartotéka
            </div>
          </div>

          {/* NAV */}
          <nav className="flex-1 p-4 space-y-2">
            {menu.map((item) =>
              item.label === "Pacienti" ? (
                <PacientiMenu key="Pacienti" />
              ) : item.special === "studie-menu" ? (
                <StudieMenu key="Studie" />
              ) : (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href!)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-brand-600 text-white shadow-sm dark:bg-brand-700"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            )}
          </nav>

          {/* LOGOUT */}
          <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              <LogOut className="w-4 h-4" />
              Odhlásit se
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-4 px-6 py-3 border-b-4 border-brand-600 bg-white dark:bg-neutral-800 shadow-sm transition-colors">
            <h1 className="text-lg font-bold text-brand-900 dark:text-brand-100">{role}</h1>
            {/* Vyvolávací systém: kolik kde čeká — vidět na každé stránce */}
            <div className="flex-1 flex justify-center">
              <QueueStatusBar
                boardHref={
                  pathname.includes("/reception")
                    ? "/reception"
                    : pathname.includes("/doctor")
                    ? "/doctor"
                    : "/lab"
                }
              />
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-neutral-700 hover:scale-110 transition-transform"
              aria-label="Přepnout téma"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
            </button>
          </header>

          <main className="flex-1 p-6 bg-[#f4f7f8] dark:bg-neutral-900 dark:text-gray-100 transition-colors duration-300">
            <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md p-6 transition-colors">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
