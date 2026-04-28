"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface Props {
  from: string | null; // lokální ISO yyyy-mm-dd
  to: string | null;   // lokální ISO yyyy-mm-dd
  onChange: (from: string | null, to: string | null) => void;
}

/**
 * Převod Date -> lokální ISO "YYYY-MM-DD" (bez UTC posunu)
 */
function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parsuje lokální ISO "YYYY-MM-DD" na místní Date (bez UTC posunu)
 */
function parseLocalISO(s: string) {
  const [y, m, day] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, day || 1);
}

export function DateRangePicker({ from, to, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // lokální stav (stringy lokální ISO)
  const [localFrom, setLocalFrom] = useState<string | null>(from);
  const [localTo, setLocalTo] = useState<string | null>(to);

  // zavření při kliknutí mimo
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Používáme lokální ISO (yyyy-mm-dd) pro ukládání — žádné toISOString()
  const applyRange = () => {
    onChange(localFrom, localTo);
    setIsOpen(false);
  };

  const clearRange = () => {
    setLocalFrom(null);
    setLocalTo(null);
    onChange(null, null);
    setIsOpen(false);
  };

  // PRESET FUNKCE (správně řeší lokální datumy a týden začíná pondělím)
  const setPreset = (type: "today" | "week" | "month" | "year") => {
    const now = new Date();
    let fromD: Date;
    let toD: Date;

    switch (type) {
      case "today":
        // jeden den (lokální)
        fromD = startOfDay(now);
        toD = startOfDay(now);
        break;

      case "week":
        // pondělí - neděle, weekStartsOn: 1 (pondělí)
        fromD = startOfWeek(now, { weekStartsOn: 1 });
        toD = endOfWeek(now, { weekStartsOn: 1 });
        break;

      case "month":
        fromD = startOfMonth(now);
        toD = endOfMonth(now);
        break;

      case "year":
        fromD = startOfYear(now);
        toD = endOfYear(now);
        break;
    }

    const fromStr = toLocalISO(fromD);
    const toStr = toLocalISO(toD);

    setLocalFrom(fromStr);
    setLocalTo(toStr);
    onChange(fromStr, toStr);
    setIsOpen(false);
  };

  // Zobrazovací text: převedeme lokální ISO na Date bez UTC shiftu a formátujeme
  const displayLabel = () => {
    if (from && to) {
      const dFrom = parseLocalISO(from);
      const dTo = parseLocalISO(to);
      return `${format(dFrom, "d.M.yyyy")} – ${format(dTo, "d.M.yyyy")}`;
    }
    return "Vyberte datum";
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full px-3 py-2 rounded-md border dark:bg-neutral-900 flex items-center justify-between"
      >
        <span className={from && to ? undefined : "text-gray-400"}>{displayLabel()}</span>
        <CalendarIcon className="w-4 h-4 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg p-4 w-[320px]">
          <div className="flex flex-col gap-4">
            {/* Presety */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPreset("today")}
                className="px-2 py-1 rounded-md text-sm bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200"
              >
                Dnes
              </button>
              <button
                onClick={() => setPreset("week")}
                className="px-2 py-1 rounded-md text-sm bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200"
              >
                Tento týden
              </button>
              <button
                onClick={() => setPreset("month")}
                className="px-2 py-1 rounded-md text-sm bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200"
              >
                Tento měsíc
              </button>
              <button
                onClick={() => setPreset("year")}
                className="px-2 py-1 rounded-md text-sm bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200"
              >
                Tento rok
              </button>
            </div>

            {/* Manuální vstup */}
            <div className="flex flex-col gap-1">
              <label className="text-sm">Od</label>
              <input
                type="date"
                value={localFrom || ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setLocalFrom(v);
                }}
                className="px-3 py-2 border rounded-md dark:bg-neutral-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm">Do</label>
              <input
                type="date"
                value={localTo || ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setLocalTo(v);
                }}
                className="px-3 py-2 border rounded-md dark:bg-neutral-900"
              />
            </div>

            {/* Akční tlačítka */}
            <div className="flex justify-between">
              <button
                onClick={clearRange}
                className="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200"
              >
                Vymazat
              </button>
              <button
                onClick={applyRange}
                className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Použít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
