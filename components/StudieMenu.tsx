"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudieMenu() {
  const pathname = usePathname();
  const router = useRouter();

  // otevřené, pokud jsme na /studies/...
  const [isOpen, setIsOpen] = useState(pathname.startsWith("/studies"));

  useEffect(() => {
    if (pathname.startsWith("/reception/studies")) {
      setTimeout(() => setIsOpen(true), 0);
    }
  }, [pathname]);

  const isSearchPage = pathname === "/reception/studies/search";

  const isStudyCard = pathname.startsWith("/studies/detail");

  return (
    <div className="flex flex-col">
      {/* Hlavní tlačítko „Studie“ */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          "flex items-center justify-between w-full text-left px-5 py-2.5 rounded-md transition hover:bg-gray-100 dark:hover:bg-neutral-800",
          isOpen &&
            "bg-gray-100 dark:bg-neutral-800 font-semibold text-blue-600"
        )}
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          Studie
        </span>

        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Podmenu */}
      {isOpen && (
        <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-gray-200 dark:border-neutral-700 pl-3">
          {/* Vyhledávání */}
          <button
            onClick={() => router.push("/reception/studies/search")}

            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
              isSearchPage
                ? "text-blue-600 font-semibold bg-blue-50 dark:bg-neutral-800 border-l-2 border-blue-600 shadow-inner"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
            )}
          >
            <Search className="w-3 h-3" />
            Vyhledávání
          </button>

          {/* Karta studie */}
          <button
            onClick={() => router.push("/studies/detail")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
              isStudyCard
                ? "text-blue-600 font-semibold bg-blue-50 dark:bg-neutral-800 border-l-2 border-blue-600 shadow-inner"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
            )}
          >
            <FileText className="w-3 h-3" />
            Karta studie
          </button>
        </div>
      )}
    </div>
  );
}
