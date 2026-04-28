"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  ClipboardList,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useDrafts from "@/components/hooks/useDrafts";
import MenuPatientsBadge from "@/components/MenuPatientsBadge";

export default function SidebarMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { latestId } = useDrafts();

  const [isPacientiOpen, setIsPacientiOpen] = useState(
    pathname.startsWith("/reception/patients")
  );

  // 🔧 Bezpečné otevření submenu při přechodu do /reception/patients
  useEffect(() => {
    if (pathname.startsWith("/reception/patients")) {
      setTimeout(() => setIsPacientiOpen(true), 0);
    }
  }, [pathname]);

  const isCardActive = pathname.startsWith("/reception/patients/");

  // 🧠 Otevře poslední rozeditovanou kartu (nebo seznam pacientů)
  const openLastDraft = () => {
    try {
      console.log("[Sidebar] latestId:", latestId);

      if (latestId && typeof latestId === "string") {
        const id = latestId.replace(/(^['"]|['"]$)/g, "").trim();
        const path = `/reception/patients/${encodeURIComponent(id)}`;
        console.log("[Sidebar] Navigating to:", path);
        router.push(path);
      } else {
        console.log("[Sidebar] No latestId, going to list");
        router.push("/reception/patients");
      }
    } catch (err) {
      console.error("[Sidebar] Navigation error:", err);
      router.push("/reception/patients");
    }
  };

  return (
    <aside className="w-60 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          🩺 Kartotéka
        </h1>
      </div>

      <nav className="flex flex-col py-4 text-sm text-gray-700 dark:text-gray-300">
        <SidebarItem href="/" icon={<Home className="w-4 h-4" />}>
          Dashboard
        </SidebarItem>

        {/* Pacienti */}
        <button
          onClick={() => setIsPacientiOpen((p) => !p)}
          className={cn(
            "flex items-center justify-between w-full text-left px-5 py-2.5 rounded-md transition hover:bg-gray-100 dark:hover:bg-neutral-800",
            isPacientiOpen &&
              "bg-gray-100 dark:bg-neutral-800 font-semibold text-blue-600"
          )}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pacienti
          </span>
          {isPacientiOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Podmenu */}
        {isPacientiOpen && (
          <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-gray-200 dark:border-neutral-700 pl-3">
            <SidebarSubItem
              href="/reception/patients"
              icon={<Search className="w-3 h-3" />}
              active={pathname === "/reception/patients"}
            >
              Vyhledávání
            </SidebarSubItem>

            {/* Karta pacienta — otevře poslední draft */}
            <button
              onClick={openLastDraft}
              className={cn(
                "relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-left",
                isCardActive
                  ? "text-blue-700 font-semibold bg-blue-100 dark:bg-neutral-800 border-l-2 border-blue-600 shadow-inner"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
              )}
            >
              {isCardActive && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md"></span>
              )}
              <ClipboardList className="w-3 h-3" />
              <span className="flex items-center gap-1.5">
                Karta pacienta
                <MenuPatientsBadge />
              </span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}

function SidebarItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-md transition hover:bg-gray-100 dark:hover:bg-neutral-800",
        isActive &&
          "bg-gray-100 dark:bg-neutral-800 font-semibold text-blue-600"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function SidebarSubItem({
  href,
  icon,
  children,
  active,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
        active
          ? "text-blue-600 font-semibold bg-blue-50 dark:bg-neutral-800 border-l-2 border-blue-600 shadow-inner"
          : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
      )}
    >
      {active && (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md"></span>
      )}
      {icon}
      {children}
    </Link>
  );
}
