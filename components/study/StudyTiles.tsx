"use client";

/**
 * Dlaždice karty studie (bento):
 *   Popis (2 sloupce × 2 řádky) · Pacient · Žádanka · Výkony · Záznam · Přílohy (jen když jsou)
 * Kontextová hustota: v dlaždicích jen vyplněné údaje; nic vyplněného = Ghost.
 */

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { BentoTile, DataRow, Metric } from "@/components/ui/bento";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { legacyStudyEditUrl } from "@/lib/legacy";
import { useSession } from "@/components/auth/SessionProvider";
import { ageYears } from "@/lib/study/card-check";
import { formatDate, formatDateTime, formatRc, hasReport, patientName } from "@/lib/studies";

/** Seznam řádků, ze kterého se vynechají prázdné hodnoty. */
function Rows({ rows, empty }: { rows: [string, React.ReactNode][]; empty: string | null }) {
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (filled.length === 0) return empty ? <Ghost label={empty} /> : null; // null = dlaždice už něco ukazuje
  return (
    <dl className="divide-y divide-ui-rule">
      {filled.map(([label, v]) => (
        <DataRow key={label} label={label}>
          {v}
        </DataRow>
      ))}
    </dl>
  );
}

export function ReportTile({ study: s, index }: { study: StudyInfo; index: number }) {
  const done = hasReport(s);
  const canWrite = useSession().can("report.write"); // popisuje lékař (a admin)
  return (
    <BentoTile
      span={2}
      rows={2}
      index={index}
      title={
        done ? (
          <span>
            Popis · <span className="text-ui-ink">{s.nameDescriptionChanged ?? s.usernameDescriptionChanged ?? "—"}</span>
            <span className="text-ui-faint"> · {formatDateTime(s.dateDescriptionChanged)}</span>
            {s.correctionNumber > 0 && <span className="text-ui-faint"> · {s.correctionNumber}. oprava</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            Popis <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-ui-faint">čeká na popis</span>
          </span>
        )
      }
      action={
        canWrite && (
        <a
          href={legacyStudyEditUrl(s.id, s.pid)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-ui-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {done ? "Upravit popis" : "Popsat"}
        </a>
        )
      }
    >
      {done ? (
        <p className="max-w-[72ch] whitespace-pre-wrap text-[15px] leading-7">{s.description}</p>
      ) : (
        <Ghost label="Studie zatím není popsaná" className="pt-1" />
      )}
      {s.remark && (
        <div className="mt-5 rounded-lg border border-ui-line bg-ui-raised px-3 py-2.5">
          <div className="text-[12px] text-ui-muted">Poznámka</div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{s.remark}</p>
        </div>
      )}
    </BentoTile>
  );
}

export function PatientTile({ study: s, index }: { study: StudyInfo; index: number }) {
  const p = s.patientDataInfo;
  const age = ageYears(p?.birthDate);
  return (
    <BentoTile
      index={index}
      title="Pacient"
      action={
        <Link href={`/reception/patients/${encodeURIComponent(s.pid)}`} className="text-[13px] text-ui-primary hover:underline">
          Karta
        </Link>
      }
    >
      <div className="mb-2">
        <div className="truncate text-[17px] font-semibold leading-snug">{patientName(s)}</div>
        <div className="text-[13px] text-ui-muted">
          {formatRc(s.pid)}
          {age !== null && ` · ${age} let`}
        </div>
      </div>
      <Rows
        empty="Bez dalších údajů"
        rows={[
          ["Pojišťovna", s.insuranceCompanyInfo ? `${s.idInsuranceCompany} ${s.insuranceCompanyInfo.description}` : s.idInsuranceCompany],
          ["Výška / váha", p?.height || p?.weight ? `${p?.height ?? "—"} / ${p?.weight ?? "—"}` : null],
          ["Telefon", p?.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="hover:text-ui-primary">{p.phone}</a>],
        ]}
      />
    </BentoTile>
  );
}

export function RequestTile({ study: s, index }: { study: StudyInfo; index: number }) {
  const inst = s.medicalInstitutionRequestedInfo;
  return (
    <BentoTile index={index} title="Žádanka">
      {s.idMedicalDiagnosisRequested && (
        <Metric
          className="mb-2"
          value={<span className="text-[22px]">{s.idMedicalDiagnosisRequested}</span>}
          sub={s.medicalDiagnosisRequestedInfo?.description}
        />
      )}
      <Rows
        empty={s.idMedicalDiagnosisRequested ? null : "Bez žádanky"}
        rows={[
          ["Odesílající", inst?.description ?? s.idMedicalInstitutionRequested],
          ["Lékař", inst?.doctorName],
          ["Odbornost", inst?.medicalSkillInfo?.name],
          ["IČZ", inst?.icz],
          ["Datum žádanky", s.requestDate ? formatDate(s.requestDate) : null],
        ]}
      />
    </BentoTile>
  );
}

export function ServicesTile({
  study: s,
  names,
  index,
}: {
  study: StudyInfo;
  names: Record<string, string>;
  index: number;
}) {
  const services = s.studyServiceInfo ?? [];
  return (
    <BentoTile index={index} title={`Výkony${services.length ? ` · ${services.length}` : ""}`}>
      {services.length === 0 ? (
        <Ghost label="Bez vykázaných výkonů" />
      ) : (
        <ul className="divide-y divide-ui-rule">
          {services.map((v) => (
            <li key={v.id} className="flex items-baseline gap-3 py-1.5 text-sm">
              <span className="w-12 shrink-0 text-ui-muted">{v.idMedicalService}</span>
              <span className="min-w-0 flex-1 truncate" title={names[v.idMedicalService]}>
                {names[v.idMedicalService] ?? <Skeleton className="inline-block h-3 w-24 align-middle" />}
              </span>
              <span className="shrink-0">{v.serviceCount ?? 1}×</span>
            </li>
          ))}
        </ul>
      )}
      {(s.rtgKap != null || s.rtgSeries != null) && (
        <dl className="mt-2 divide-y divide-ui-rule border-t border-ui-rule">
          {s.rtgKap != null && <DataRow label="KAP">{`${s.rtgKap.toLocaleString("cs-CZ")} µGy·m²`}</DataRow>}
          {s.rtgSeries != null && <DataRow label="Počet expozic">{s.rtgSeries}</DataRow>}
        </dl>
      )}
    </BentoTile>
  );
}

export function RecordTile({ study: s, workplace, index }: { study: StudyInfo; workplace: string | null; index: number }) {
  return (
    <BentoTile index={index} title="Záznam">
      <Rows
        empty="Bez záznamu"
        rows={[
          ["Pracoviště", <span key="w" title={workplace ?? undefined}>{s.idWorkingplaceCreated}{workplace ? ` · ${workplace}` : ""}</span>],
          ["Založil", s.whoCr ? `${s.whoCr} · ${formatDateTime(s.dateCr)}` : null],
          ["Upravil", s.whoEdit && s.dateEdit !== s.dateCr ? `${s.whoEdit} · ${formatDateTime(s.dateEdit)}` : null],
          ["Odesláno", s.dateEmailed ? formatDateTime(s.dateEmailed) : null],
          ["Online přístup", s.studyRemoteAccessInfo ? `do ${formatDate(s.studyRemoteAccessInfo.dateValidTill)}` : null],
        ]}
      />
      <details className="group mt-2 text-[12px] text-ui-muted">
        <summary className="cursor-pointer list-none hover:text-ui-ink">DICOM UID</summary>
        <p className="mt-1 break-all">{s.dicomUid}</p>
      </details>
    </BentoTile>
  );
}

export function AttachmentsTile({ study: s, index }: { study: StudyInfo; index: number }) {
  const list = s.studyAttachmentInfo ?? [];
  if (list.length === 0) return null; // kontextová hustota: bez příloh žádná dlaždice
  return (
    <BentoTile span={2} index={index} title={`Přílohy · ${list.length}`}>
      <dl className="divide-y divide-ui-rule">
        {list.map((a) => (
          <DataRow key={a.id} label={a.documentDataInfo?.catMimetypeName ?? "Soubor"}>
            {a.documentDataInfo?.name}
          </DataRow>
        ))}
      </dl>
    </BentoTile>
  );
}

export function StudyCardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="ui-tile space-y-3 p-4 sm:col-span-2 xl:row-span-2">
          <Skeleton className="h-3 w-40" />
          {[92, 85, 88, 60, 75].map((w) => (
            <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ui-tile space-y-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
