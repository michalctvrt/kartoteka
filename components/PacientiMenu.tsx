"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useDrafts from "@/components/hooks/useDrafts";
import MenuPatientsBadge from "@/components/MenuPatientsBadge";

export default function PacientiMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { latestId } = useDrafts();

  const [isOpen, setIsOpen] = useState(
    pathname.includes("/reception/patients")
  );

  useEffect(() => {
    if (pathname.startsWith("/reception/patients")) {
      setTimeout(() => setIsOpen(true), 0);
    }
  }, [pathname]);

  const isPatientsPage = pathname === "/reception/patients";
  const isPatientCard = pathname.startsWith("/reception/patients/");

  const openLastDraft = () => {
    if (latestId) {
      router.push(`/reception/patients/${latestId}`);
    } else {
      router.push("/reception/patients");
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hlavní tlačítko „Pacienti“ */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          "flex items-center justify-between w-full text-left px-5 py-2.5 rounded-md transition hover:bg-gray-100 dark:hover:bg-neutral-800",
          isOpen &&
            "bg-gray-100 dark:bg-neutral-800 font-semibold text-blue-600"
        )}
      >
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Pacienti
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
            onClick={() => router.push("/reception/patients")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
              isPatientsPage
                ? "text-blue-600 font-semibold bg-blue-50 dark:bg-neutral-800 border-l-2 border-blue-600 shadow-inner"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
            )}
          >
            <Search className="w-3 h-3" />
            Vyhledávání
          </button>

          {/* Karta pacienta */}
          <button
            onClick={openLastDraft}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors relative",
              isPatientCard
                ? "text-blue-600 font-semibold bg-blue-50 dark:bg-neutral-800 border-l-2 border-blue-600 shadow-inner"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
            )}
          >
            <ClipboardList className="w-3 h-3" />
            <span className="flex items-center gap-1.5">
              Karta pacienta
              <MenuPatientsBadge />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
