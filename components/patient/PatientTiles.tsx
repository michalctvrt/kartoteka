"use client";

/**
 * Dlaždice karty pacienta (bento). Každá dlaždice je jedna otázka:
 *   Identita (2 sloupce) · Kontakt · Tělo · Pojišťovna · Vyšetření (počet) · Poslední vyšetření (2 sloupce)
 * V režimu úprav se hodnoty na místě přepnou na pole (InlineField).
 */

import Link from "next/link";
import { ArrowRight, Copy, Mail, Phone } from "lucide-react";
import { useState } from "react";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import type { InsuranceCompanyInfo } from "@/lib/api/generated/models/InsuranceCompanyInfo";
import { BentoTile, Metric } from "@/components/ui/bento";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ModalityTag, ReportStatus } from "@/components/study/StudyBits";
import { insuranceOptions } from "@/components/hooks/useInsuranceCompanies";
import { ageYears } from "@/lib/study/card-check";
import { formatDate, formatDateTime, formatRc, hasReport } from "@/lib/studies";

/** Sytější odstíny barev čekáren pro tenký pruh poměru modalit. */
const BAR: Record<string, string> = { RTG: "bg-orange-400", UZ: "bg-sky-500", MRI: "bg-purple-500" };
import { GENDER_LABEL, type FormProps } from "./form";
import InlineField from "./InlineField";
import InsuranceCheck from "./InsuranceCheck";
import { studyHref } from "@/lib/routes";

// ─── Identita ───

export function IdentityTile({ pid, value: v, editing, onChange, index }: FormProps & { pid: string; index: number }) {
  const age = ageYears(v.birthDate);
  return (
    <BentoTile span={2} index={index} title="Osobní údaje">
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {editing && (
          <>
            <InlineField id="pf-first" label="Jméno" editing display={v.firstName}>
              <input id="pf-first" className="ui-input" value={v.firstName} onChange={(e) => onChange({ firstName: e.target.value })} />
            </InlineField>
            <InlineField id="pf-last" label="Příjmení" editing display={v.lastName}>
              <input id="pf-last" className="ui-input" value={v.lastName} onChange={(e) => onChange({ lastName: e.target.value })} />
            </InlineField>
            <InlineField id="pf-title" label="Titul" editing display={v.title}>
              <input id="pf-title" className="ui-input" value={v.title} onChange={(e) => onChange({ title: e.target.value })} />
            </InlineField>
            <InlineField id="pf-middle" label="Druhé jméno" editing display={v.middleName}>
              <input id="pf-middle" className="ui-input" value={v.middleName} onChange={(e) => onChange({ middleName: e.target.value })} />
            </InlineField>
          </>
        )}
        <InlineField id="pf-rc" label="Rodné číslo" editing={false} display={<RcValue pid={pid} />}>
          {null}
        </InlineField>
        <InlineField
          id="pf-birth"
          label="Datum narození"
          editing={editing}
          display={v.birthDate ? `${formatDate(v.birthDate)}${age !== null ? ` · ${age} let` : ""}` : ""}
        >
          <input id="pf-birth" type="date" className="ui-input" value={v.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} />
        </InlineField>
        <InlineField id="pf-gender" label="Pohlaví" editing={editing} display={GENDER_LABEL[v.gender] ?? ""}>
          <select id="pf-gender" className="ui-input" value={v.gender} onChange={(e) => onChange({ gender: e.target.value as FormProps["value"]["gender"] })}>
            <option value="">—</option>
            <option value="MALE">Muž</option>
            <option value="FEMALE">Žena</option>
          </select>
        </InlineField>
        {/* titul a druhé jméno mimo úpravy jen když jsou vyplněné */}
        {!editing && (
          <>
            <InlineField id="pf-title-v" label="Titul" editing={false} display={v.title} hideEmpty>
              {null}
            </InlineField>
            <InlineField id="pf-middle-v" label="Druhé jméno" editing={false} display={v.middleName} hideEmpty>
              {null}
            </InlineField>
          </>
        )}
      </div>
    </BentoTile>
  );
}

function RcValue({ pid }: { pid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{formatRc(pid)}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(pid);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="rounded p-1 text-ui-faint transition-colors hover:bg-ui-raised hover:text-ui-ink"
        aria-label="Zkopírovat rodné číslo"
        title={copied ? "Zkopírováno" : "Zkopírovat"}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {copied && <span className="text-[12px] text-ui-muted">zkopírováno</span>}
    </span>
  );
}

// ─── Kontakt ───

export function ContactTile({ value: v, editing, onChange, index }: FormProps & { index: number }) {
  return (
    <BentoTile index={index} title="Kontakt">
      <div className="space-y-2">
        <InlineField
          id="pf-phone"
          label="Telefon"
          editing={editing}
          display={
            v.phone && (
              <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ui-primary">
                <Phone className="h-3.5 w-3.5 text-ui-faint" /> {v.phone}
              </a>
            )
          }
        >
          <input id="pf-phone" type="tel" className="ui-input" value={v.phone} onChange={(e) => onChange({ phone: e.target.value })} />
        </InlineField>
        <InlineField
          id="pf-email"
          label="E-mail"
          editing={editing}
          display={
            v.email && (
              <a href={`mailto:${v.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-ui-primary">
                <Mail className="h-3.5 w-3.5 shrink-0 text-ui-faint" /> <span className="truncate">{v.email}</span>
              </a>
            )
          }
        >
          <input id="pf-email" type="email" className="ui-input" value={v.email} onChange={(e) => onChange({ email: e.target.value })} />
        </InlineField>
      </div>
    </BentoTile>
  );
}

// ─── Tělo ───

export function BodyTile({ value: v, editing, onChange, index }: FormProps & { index: number }) {
  return (
    <BentoTile index={index} title="Výška a váha">
      {editing ? (
        <div className="grid grid-cols-2 gap-3">
          <InlineField id="pf-height" label="Výška (cm)" editing display={v.height}>
            <input id="pf-height" type="number" inputMode="numeric" className="ui-input" value={v.height} onChange={(e) => onChange({ height: e.target.value })} />
          </InlineField>
          <InlineField id="pf-weight" label="Váha (kg)" editing display={v.weight}>
            <input id="pf-weight" type="number" inputMode="numeric" className="ui-input" value={v.weight} onChange={(e) => onChange({ weight: e.target.value })} />
          </InlineField>
        </div>
      ) : v.height || v.weight ? (
        <Metric
          value={`${v.height || "—"} / ${v.weight || "—"}`}
          unit="cm / kg"
        />
      ) : (
        <Ghost label="Výška a váha nejsou vyplněné" />
      )}
    </BentoTile>
  );
}

// ─── Pojišťovna ───

export function InsuranceTile({
  value: v,
  editing,
  onChange,
  index,
  companies,
  name,
  pid,
  check,
  onUseCode,
}: FormProps & {
  index: number;
  companies: InsuranceCompanyInfo[];
  name: string;
  pid: string;
  /** ověřovat v registru pojištěnců (oprávnění insurance.check) */
  check?: boolean;
  onUseCode?: (code: string) => void;
}) {
  return (
    <BentoTile index={index} title="Pojišťovna">
      {editing ? (
        <>
          <label htmlFor="pf-ins" className="sr-only">Pojišťovna</label>
          <select id="pf-ins" className="ui-input" value={v.idInsuranceCompany} onChange={(e) => onChange({ idInsuranceCompany: e.target.value })}>
            {insuranceOptions(companies, v.idInsuranceCompany).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      ) : v.idInsuranceCompany ? (
        <Metric value={v.idInsuranceCompany} sub={name || undefined} />
      ) : (
        <Ghost label="Pojišťovna není vyplněná" />
      )}
      {check && !editing && <InsuranceCheck pid={pid} cardCode={v.idInsuranceCompany} onUseCode={onUseCode} />}
    </BentoTile>
  );
}

// ─── Vyšetření (počet) ───

export function StudiesCountTile({ studies, loading, index }: { studies: StudyInfo[]; loading: boolean; index: number }) {
  const counts = Object.entries(
    studies.reduce<Record<string, number>>((acc, s) => {
      const m = s.idMedicalServiceCategory || "—";
      acc[m] = (acc[m] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const waiting = studies.filter((s) => !hasReport(s)).length;

  return (
    <BentoTile index={index} title="Vyšetření">
      {loading ? (
        <div className="space-y-3 pt-1">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : studies.length === 0 ? (
        <Ghost label="Zatím žádné vyšetření" />
      ) : (
        <>
          <Metric value={studies.length} sub={waiting > 0 ? `${waiting} čeká na popis` : "Vše popsáno"} />
          {/* poměr modalit – tenký pruh v barvách čekáren */}
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-ui-raised" aria-hidden>
            {counts.map(([m, n]) => (
              <span
                key={m}
                className={BAR[m] ?? "bg-ui-control"}
                style={{ width: `${(n / studies.length) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ui-muted">
            {counts.map(([m, n]) => (
              <span key={m}>
                {m} {n}
              </span>
            ))}
          </div>
        </>
      )}
    </BentoTile>
  );
}

// ─── Poslední vyšetření (2 sloupce, když pacient nemá lístek) ───

export function LastStudyTile({ study, loading, index }: { study?: StudyInfo; loading: boolean; index: number }) {
  return (
    <BentoTile
      span={2}
      index={index}
      title="Poslední vyšetření"
      action={
        study && (
          <Link
            href={studyHref(study.id)}
            className="group inline-flex items-center gap-1 text-[13px] text-ui-primary hover:underline"
          >
            Karta studie <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )
      }
    >
      {loading ? (
        <div className="space-y-3 pt-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ) : !study ? (
        <Ghost label="Pacient zatím nemá žádné vyšetření" />
      ) : (
        <Link href={studyHref(study.id)} className="block">
          <div className="flex flex-wrap items-center gap-2">
            <ModalityTag modality={study.idMedicalServiceCategory} />
            <span className="text-lg font-semibold leading-tight">{formatDateTime(study.studyDate)}</span>
            <span className="text-[13px]">
              <ReportStatus study={study} />
            </span>
          </div>
          {hasReport(study) ? (
            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-ui-muted">{study.description}</p>
          ) : (
            study.medicalDiagnosisRequestedInfo && (
              <p className="mt-2 text-sm text-ui-muted">
                {study.idMedicalDiagnosisRequested} {study.medicalDiagnosisRequestedInfo.description}
              </p>
            )
          )}
        </Link>
      )}
    </BentoTile>
  );
}

// ─── Načítání celé karty ───

export function PatientCardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[2, 1, 1, 2, 1, 1].map((span, i) => (
          <div key={i} className={`ui-tile space-y-3 p-4 ${span === 2 ? "sm:col-span-2" : ""}`}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
        <div className="ui-tile space-y-3 p-4 sm:col-span-2 xl:col-span-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
