"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { User, Calendar, Hash, ArrowLeft } from "lucide-react";

interface Patient {
  id: number;
  name: string;
  birth: string;
  rc: string;
}

function usePatientDraft<T extends object | null>(
  patientId: string,
  initial: T
) {
  const userId = "anon";
  const key = `patient-draft:${patientId}:${userId}`;
  const metaKey = `${key}:meta`;
  const bcName = `patient-draft-bc:${patientId}:${userId}`;

  const [draft, setDraftState] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  });

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => {
    try {
      const meta = localStorage.getItem(metaKey);
      return meta ? (JSON.parse(meta) as { ts: number }).ts : null;
    } catch {
      return null;
    }
  });

  const bcRef = useRef<BroadcastChannel | null>(null);
  const pendingRef = useRef<T | null>(draft ?? initial);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("BroadcastChannel" in window) {
      bcRef.current = new BroadcastChannel(bcName);
      bcRef.current.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { type?: string };
        if (data?.type === "draft-updated") {
          try {
            const raw = localStorage.getItem(key);
            setDraftState(raw ? (JSON.parse(raw) as T) : null);
            const metaRaw = localStorage.getItem(metaKey);
            setLastSavedAt(
              metaRaw ? (JSON.parse(metaRaw) as { ts: number }).ts : null
            );
          } catch {}
        }
        if (data?.type === "draft-removed") {
          setDraftState(null);
          setLastSavedAt(null);
        }
      };
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === key || ev.key === metaKey) {
        try {
          const raw = localStorage.getItem(key);
          setDraftState(raw ? (JSON.parse(raw) as T) : null);
          const metaRaw = localStorage.getItem(metaKey);
          setLastSavedAt(
            metaRaw ? (JSON.parse(metaRaw) as { ts: number }).ts : null
          );
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      bcRef.current?.close();
    };
  }, [key, metaKey, bcName]);

  const persist = useCallback(
    (obj: T | null) => {
      try {
        if (obj === null) {
          localStorage.removeItem(key);
          localStorage.removeItem(metaKey);
          bcRef.current?.postMessage({ type: "draft-removed" });
          setDraftState(null);
          setLastSavedAt(null);
          return;
        }
        localStorage.setItem(key, JSON.stringify(obj));
        const meta = { ts: Date.now() };
        localStorage.setItem(metaKey, JSON.stringify(meta));
        setLastSavedAt(meta.ts);
        bcRef.current?.postMessage({ type: "draft-updated" });
      } catch {}
    },
    [key, metaKey]
  );

  const setDraft = useCallback(
    (updater: React.SetStateAction<T | null>) => {
      setDraftState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T | null) => T | null)(prev)
            : updater;
        pendingRef.current = next;
        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => persist(next), 800);
        return next;
      });
    },
    [persist]
  );

  const setField = useCallback(
    (path: string, value: unknown) => {
      setDraft((prev) => {
        const base = (
          prev
            ? { ...(prev as Record<string, unknown>) }
            : { ...(initial as Record<string, unknown>) }
        ) as Record<string, unknown>;
        const parts = path.split(".");
        let cur: Record<string, unknown> = base;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          cur[p] = { ...((cur[p] as Record<string, unknown>) ?? {}) };
          cur = cur[p] as Record<string, unknown>;
        }
        cur[parts[parts.length - 1]] = value;
        return base as T;
      });
    },
    [initial, setDraft]
  );

  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        const final = pendingRef.current;
        if (final) {
          localStorage.setItem(key, JSON.stringify(final));
          localStorage.setItem(metaKey, JSON.stringify({ ts: Date.now() }));
        }
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [key, metaKey]);

  const discardDraft = useCallback(() => persist(null), [persist]);
  const saveDraftLocally = useCallback(() => persist(null), [persist]);
  const hasDraft = Boolean(draft);

  return {
    draft,
    setDraft,
    setField,
    discardDraft,
    saveDraftLocally,
    hasDraft,
    lastSavedAt,
  } as const;
}

export default function PatientCard({ id }: { id: string }) {
  const router = useRouter();

  const demo = useMemo<Patient[]>(
    () => [
      { id: 1, name: "Jan Novák", birth: "12.03.1982", rc: "8203124589" },
      { id: 2, name: "Eva Dvořáková", birth: "08.07.1990", rc: "9007082222" },
      { id: 3, name: "Petr Malý", birth: "23.11.1975", rc: "7511239999" },
    ],
    []
  );

  const [patients, setPatients] = useState<Patient[]>(demo);
  const patientIndex = patients.findIndex((p) => p.id === Number(id));
  const patient = patientIndex >= 0 ? patients[patientIndex] : undefined;

  const {
    draft,
    setField,
    setDraft,
    discardDraft,
    saveDraftLocally,
    hasDraft,
    lastSavedAt,
  } = usePatientDraft<Patient | null>(String(id), patient ?? null);

  const [editing, setEditing] = useState(false);
  const [restorePromptShown, setRestorePromptShown] = useState(false);

  // Safe async setState inside effect (React recommended pattern)
  useEffect(() => {
    if (hasDraft && !restorePromptShown) {
      // oddálíme nastavení stavu na další tick => žádné varování
      const timeout = setTimeout(() => {
        startTransition(() => {
          setRestorePromptShown(true);
          const want = window.confirm(
            "Nalezena neuložená editace pro tohoto pacienta. Chcete obnovit rozpracované změny?"
          );
          if (want) setEditing(true);
        });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [hasDraft, restorePromptShown]);

  // definujeme hooky před returnem, takže už nejsou „conditionally called“
  const doSave = useCallback(() => {
    if (!patient) return;
    const updated = { ...patient, ...(draft ?? {}) };
    setPatients((prev) => {
      const copy = [...prev];
      copy[patientIndex] = updated;
      return copy;
    });
    saveDraftLocally();
    setEditing(false);
  }, [draft, patient, patientIndex, saveDraftLocally]);

  const doDiscard = useCallback(() => {
    discardDraft();
    setEditing(false);
  }, [discardDraft]);

  // bezpečný early return je až po všech hookách
  if (!patient) {
    return (
      <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pacient nenalezen.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-3 inline-block text-sm text-blue-600 hover:underline"
        >
          Zpět
        </button>
      </div>
    );
  }

  const current = (editing && (draft ?? patient)) || patient;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            {current.name}
            {hasDraft && (
              <span
                title="Neuložené změny"
                className="inline-block w-3 h-3 rounded-full bg-red-600"
              />
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Karta pacienta
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200"
          >
            <ArrowLeft className="w-4 h-4 inline" /> Zpět
          </button>

          <button
            onClick={() => {
              setEditing(true);
              if (!hasDraft) setDraft({ ...patient });
            }}
            className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            Upravit údaje
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium mb-4">Základní údaje</h2>

        {editing ? (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <label className="flex flex-col gap-2">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Jméno a příjmení
              </span>
              <input
                className="p-2 rounded border"
                value={current.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Rodné číslo
              </span>
              <input
                className="p-2 rounded border"
                value={current.rc}
                onChange={(e) => setField("rc", e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Datum narození
              </span>
              <input
                className="p-2 rounded border"
                value={current.birth}
                onChange={(e) => setField("birth", e.target.value)}
              />
            </label>

            <div className="col-span-2 mt-2 text-sm text-gray-500">
              {hasDraft
                ? `Neuložené změny (poslední autosave: ${
                    lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "—"
                  })`
                : "Vše uloženo"}
            </div>

            <div className="col-span-2 flex gap-2 mt-2">
              <button
                onClick={doSave}
                className="px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700"
              >
                Uložit
              </button>
              <button
                onClick={doDiscard}
                className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
              >
                Zahodit změny
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50"
              >
                Zavřít (pokračovat později)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Jméno a příjmení:
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {current.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Rodné číslo:
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {current.rc}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Datum narození:
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {current.birth}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium mb-4">Záznamy</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Zatím žádné záznamy.
        </p>
      </div>
    </div>
  );
}
