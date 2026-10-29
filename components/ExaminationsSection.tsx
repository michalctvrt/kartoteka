"use client";

/**
 * Vyšetření pacienta na kartě – dlaždice přes celou šířku bento mřížky.
 * Data dodává rodič (usePatientStudies), aby je sdílela i souhrnná dlaždice.
 * Klik na řádek → karta studie. Filtr modality jen z modalit, které pacient má.
 */

import { useMemo, useState } from "react";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { BentoTile } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import StudyList from "@/components/study/StudyList";

const PAGE = 8;

export default function ExaminationsSection({
  studies,
  loading,
  error,
  index = 0,
}: {
  studies: StudyInfo[];
  loading: boolean;
  error?: string | null;
  index?: number;
}) {
  const [filter, setFilter] = useState("ALL");
  const [shown, setShown] = useState(PAGE);

  const modalities = useMemo(
    () => [...new Set(studies.map((s) => s.idMedicalServiceCategory).filter(Boolean))],
    [studies]
  );
  const filtered = filter === "ALL" ? studies : studies.filter((s) => s.idMedicalServiceCategory === filter);
  const visible = filtered.slice(0, shown);

  return (
    <BentoTile
      span={4}
      index={index}
      bodyClassName="px-0 pb-1"
      title={
        <span>
          Vyšetření <span className="text-ui-faint">{loading ? "" : studies.length}</span>
        </span>
      }
      action={
        modalities.length > 1 && (
          <Segmented
            size="sm"
            label="Modalita"
            value={filter}
            onChange={(m) => {
              setFilter(m);
              setShown(PAGE);
            }}
            options={["ALL", ...modalities].map((m) => ({ value: m, label: m === "ALL" ? "Vše" : m }))}
          />
        )
      }
    >
      {error ? (
        <p className="px-4 py-3 text-sm text-ui-muted">Vyšetření se nepodařilo načíst. {error}</p>
      ) : (
        <StudyList studies={visible} loading={loading} emptyLabel="Pacient zatím nemá žádné vyšetření" />
      )}

      {filtered.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-4 my-2 text-[13px] text-ui-primary hover:underline"
        >
          Další {Math.min(PAGE, filtered.length - shown)} z {filtered.length - shown}
        </button>
      )}
    </BentoTile>
  );
}
