/**
 * DEMO DATA – vymyšlení pacienti a studie pro běh bez backendu (DEMO_MODE=1).
 * Žádný údaj nepatří skutečné osobě; jména, RČ i popisy jsou smyšlené.
 * Číselníky (pojišťovny, kódy diagnóz MKN-10) jsou veřejné. Kódy výkonů jsou jen ukázkové.
 * Data žijí v paměti serveru – po restartu `npm run dev` se vrátí do výchozího stavu.
 */

import type { PatientInfo } from "@/lib/api/generated/models/PatientInfo";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";

export const INSURANCE = [
  { id: "111", description: "VZP", descriptionLong: "Všeobecná zdravotní pojišťovna ČR" },
  { id: "201", description: "VoZP", descriptionLong: "Vojenská zdravotní pojišťovna ČR" },
  { id: "205", description: "ČPZP", descriptionLong: "Česká průmyslová zdravotní pojišťovna" },
  { id: "207", description: "OZP", descriptionLong: "Oborová zdravotní pojišťovna" },
  { id: "209", description: "ZPŠ", descriptionLong: "Zaměstnanecká pojišťovna Škoda" },
  { id: "211", description: "ZPMV", descriptionLong: "Zdravotní pojišťovna ministerstva vnitra ČR" },
  { id: "213", description: "RBP", descriptionLong: "RBP, zdravotní pojišťovna" },
];

export const CATEGORIES = [
  { id: "RTG", description: "Rentgen", mappedModality: "DX" },
  { id: "UZ", description: "Ultrazvuk", mappedModality: "US" },
  { id: "MRI", description: "Magnetická rezonance", mappedModality: "MR" },
];

/** Ukázkové výkony (kódy nejsou závazné). */
export const SERVICES = [
  { id: "89131", idMedicalServiceCategory: "RTG", description: "RTG HRUDNÍKU", descriptionLong: "Skiagrafie hrudních orgánů, jedna projekce" },
  { id: "89135", idMedicalServiceCategory: "RTG", description: "RTG BŘICHA", descriptionLong: "Nativní snímek břicha" },
  { id: "89141", idMedicalServiceCategory: "RTG", description: "RTG KOLENE", descriptionLong: "Skiagrafie kolenního kloubu ve dvou projekcích" },
  { id: "89143", idMedicalServiceCategory: "RTG", description: "RTG BEDERNÍ PÁTEŘE", descriptionLong: "Skiagrafie bederní páteře ve dvou projekcích" },
  { id: "89611", idMedicalServiceCategory: "UZ", description: "UZ BŘICHA", descriptionLong: "Ultrazvukové vyšetření břicha" },
  { id: "89615", idMedicalServiceCategory: "UZ", description: "UZ ŠTÍTNÉ ŽLÁZY", descriptionLong: "Ultrazvukové vyšetření štítné žlázy a krku" },
  { id: "89619", idMedicalServiceCategory: "UZ", description: "UZ KLOUBU", descriptionLong: "Ultrazvukové vyšetření kloubu a měkkých tkání" },
  { id: "89711", idMedicalServiceCategory: "MRI", description: "MR KOLENE", descriptionLong: "Magnetická rezonance kolenního kloubu" },
  { id: "89715", idMedicalServiceCategory: "MRI", description: "MR BEDERNÍ PÁTEŘE", descriptionLong: "Magnetická rezonance bederní páteře" },
  { id: "89719", idMedicalServiceCategory: "MRI", description: "MR MOZKU", descriptionLong: "Magnetická rezonance mozku" },
];

export const DIAGNOSES = [
  { id: "M255", description: "Bolest v kloubu" },
  { id: "M545", description: "Bolest v kříži" },
  { id: "R104", description: "Jiná a neurčená bolest břicha" },
  { id: "J189", description: "Pneumonie, NS" },
  { id: "S832", description: "Natržení menisku, čerstvé" },
  { id: "K802", description: "Kámen žlučníku bez cholecystitidy" },
  { id: "E041", description: "Netoxický solitární uzel štítné žlázy" },
  { id: "R51", description: "Bolest hlavy" },
];

export const INSTITUTIONS = [
  { id: "71000101", description: "Praktický lékař Demo – Olomouc", descriptionLong: "Všeobecné praktické lékařství", doctorName: "Novotný Petr", icz: "71000101" },
  { id: "71000202", description: "Ortopedie Demo", descriptionLong: "Ortopedická ambulance", doctorName: "Svobodová Jana", icz: "71000202" },
  { id: "71000303", description: "Interna Demo", descriptionLong: "Interní ambulance", doctorName: "Dvořák Martin", icz: "71000303" },
  { id: "71000404", description: "Neurologie Demo", descriptionLong: "Neurologická ambulance", doctorName: "Kučerová Eva", icz: "71000404" },
];

export const WORKINGPLACES = [
  { id: "OLOM", shortId: "OL", medicalInstitutionInfo: { id: "70000001", description: "DC Flipper Olomoucká (demo)" } },
  { id: "LESN", shortId: "LE", medicalInstitutionInfo: { id: "70000002", description: "DC Flipper Lesná (demo)" } },
];

/** Smyšlené popisy podle výkonu (ať popis sedí na vyšetření). */
const REPORTS: Record<string, string> = {
  "89131": "Plicní parenchym bez ložiskových a infiltrativních změn.\nHily nerozšířené, srdeční stín nezvětšen.\nBránice hladká, kostofrenické úhly volné.\n\nZávěr: Nález bez patologie.",
  "89135": "Bez známek volného plynu pod bránicí.\nDistribuce střevního plynu přiměřená, bez hladinek.\n\nZávěr: Nativní nález břicha bez patologie.",
  "89141": "Kloubní štěrbina zachována, kloubní plochy hladké.\nDrobné okrajové osteofyty na mediálním kondylu.\nBez známek čerstvého traumatu.\n\nZávěr: Počínající degenerativní změny.",
  "89143": "Lordóza bederní páteře oploštělá.\nSnížení meziobratlového prostoru L4/5.\nObratlová těla přiměřené výše.\n\nZávěr: Degenerativní změny L4/5.",
  "89611": "Játra přiměřené velikosti, homogenní echostruktury, bez ložisek.\nŽlučník tenkostěnný, v lumen 8 mm konkrement.\nŽlučové cesty nerozšířené. Pankreas a slezina bez nálezu.\n\nZávěr: Cholecystolitiáza.",
  "89615": "Štítná žláza přiměřené velikosti.\nV pravém laloku hypoechogenní uzel 9 × 7 mm, ostře ohraničený.\nKrční uzliny nezvětšené.\n\nZávěr: Uzel pravého laloku, kontrola za 6 měsíců.",
  "89619": "Šlachy rotátorové manžety souvislé, bez ruptury.\nMalé množství tekutiny v subakromiální burze.\n\nZávěr: Lehká subakromiální burzitida.",
  "89711": "Mediální meniskus se zvýšeným signálem v zadním rohu, dosahujícím k artikulární ploše.\nZkřížené vazy intaktní. Malý kloubní výpotek.\n\nZávěr: Ruptura zadního rohu mediálního menisku.",
  "89715": "Protruze disku L4/5 paramediálně vlevo s kontaktem s kořenem L5.\nPáteřní kanál nezúžen.\n\nZávěr: Protruze disku L4/5 vlevo.",
  "89719": "Bez ložiskových změn mozkového parenchymu.\nKomorový systém nerozšířen, střední čára nedislokována.\n\nZávěr: Nález v mezích normy.",
};

const PEOPLE: [string, string, "MALE" | "FEMALE", string][] = [
  ["Jan", "Novák", "MALE", "1968-03-14"],
  ["Marie", "Svobodová", "FEMALE", "1975-11-02"],
  ["Petr", "Dvořák", "MALE", "1982-06-21"],
  ["Eva", "Černá", "FEMALE", "1990-01-09"],
  ["Tomáš", "Procházka", "MALE", "1957-09-30"],
  ["Lucie", "Kučerová", "FEMALE", "1988-04-17"],
  ["Martin", "Veselý", "MALE", "1979-12-05"],
  ["Jana", "Horáková", "FEMALE", "1964-07-23"],
  ["Pavel", "Němec", "MALE", "2001-02-11"],
  ["Kateřina", "Marková", "FEMALE", "1995-08-28"],
  ["Josef", "Pokorný", "MALE", "1949-05-16"],
  ["Tereza", "Pospíšilová", "FEMALE", "2012-10-03"],
];

/** Smyšlené „RČ“: datum narození (ženy +50 v měsíci) + pořadí. */
function fakeRc(birth: string, female: boolean, i: number) {
  const [y, m, d] = birth.split("-");
  const mm = String(Number(m) + (female ? 50 : 0)).padStart(2, "0");
  return `${y.slice(2)}${mm}${d}${String(1000 + i * 37).slice(-4)}`;
}

export function buildPatients(): PatientInfo[] {
  return PEOPLE.map(([firstName, lastName, gender, birthDate], i) => {
    const pid = fakeRc(birthDate, gender === "FEMALE", i);
    const p = {
      id: 9000 + i,
      pid,
      idPatientData: 9500 + i,
      patientDataInfo: {
        id: 9500 + i,
        idInsuranceCompany: INSURANCE[i % INSURANCE.length].id,
        birthDate,
        gender,
        firstName,
        lastName,
        middleName: "",
        title: i === 4 ? "Ing." : "",
        email: i % 3 === 0 ? `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@example.cz" : "",
        phone: i % 2 === 0 ? `+420 777 ${100 + i * 11} ${200 + i * 7}` : "",
        weight: 55 + ((i * 7) % 40),
        height: 160 + ((i * 5) % 30),
        whoCr: "demo",
        dateCr: new Date(Date.now() - 200 * 864e5).toISOString(),
        whoEdit: "demo",
        dateEdit: new Date(Date.now() - 100 * 864e5).toISOString(),
      },
    };
    return p as unknown as PatientInfo;
  });
}

export function buildStudies(patients: PatientInfo[]): StudyInfo[] {
  const list: StudyInfo[] = [];
  const day = 864e5;
  let n = 0;
  patients.forEach((p, pi) => {
    const count = 1 + (pi % 4); // 1–4 studie na pacienta
    for (let k = 0; k < count; k++) {
      const mod = CATEGORIES[(pi + k) % 3].id;
      const forMod = SERVICES.filter((s) => s.idMedicalServiceCategory === mod);
      const svc = forMod[(pi * 2 + k) % forMod.length];
      const diag = DIAGNOSES[(pi * 3 + k) % DIAGNOSES.length];
      const inst = INSTITUTIONS[(pi + k) % INSTITUTIONS.length];
      // nejnovější studie dnes/včera, starší po týdnech; část dnešních ještě bez popisu
      const when = new Date(Date.now() - (k * 9 + (pi % 5)) * day - (pi * 47 + 8) * 60e3);
      const reported = !(k === 0 && pi % 3 === 1);
      const id = 50000100 + n * 100;
      const uid = String(3300000000 + n + 1);
      const s = {
        id,
        uid,
        dicomUid: `1.2.410.200049.2.99999.1.1.${when.toISOString().replace(/\D/g, "").slice(0, 14)}.${uid}`,
        pid: p.pid,
        patientDataInfo: p.patientDataInfo,
        idMedicalInstitutionRequested: (pi + k) % 5 === 4 ? undefined : inst.id,
        medicalInstitutionRequestedInfo: (pi + k) % 5 === 4 ? undefined : inst,
        idMedicalDiagnosisRequested: diag.id,
        medicalDiagnosisRequestedInfo: diag,
        requestDate: new Date(when.getTime() - 3 * day).toISOString().slice(0, 10),
        flagSelfPay: (pi + k) % 5 === 4,
        idInsuranceCompany: p.patientDataInfo.idInsuranceCompany,
        insuranceCompanyInfo: INSURANCE.find((x) => x.id === p.patientDataInfo.idInsuranceCompany),
        idCatInsuranceType: 1,
        idMedicalServiceCategory: mod,
        studyDate: when.toISOString(),
        studyServiceInfo: [{ id: id + 50, idStudy: id, idMedicalService: svc.id, serviceCount: 1 }],
        description: reported ? REPORTS[svc.id] : undefined,
        dateDescriptionChanged: reported ? new Date(when.getTime() + 40 * 60e3).toISOString() : undefined,
        nameDescriptionChanged: reported ? (mod === "MRI" ? "MUDr. Alena Demo" : "MUDr. Karel Demo") : undefined,
        usernameDescriptionChanged: reported ? "demo" : undefined,
        correctionNumber: 0,
        idWorkingplaceCreated: mod === "MRI" ? "OLOM" : WORKINGPLACES[pi % 2].id,
        whoCr: "recepce",
        dateCr: when.toISOString(),
        whoEdit: reported ? "demo" : "recepce",
        dateEdit: new Date(when.getTime() + (reported ? 40 : 1) * 60e3).toISOString(),
        flagUrgent: (pi + k) % 7 === 3,
        flagDeleted: false,
        flagCompleted: reported,
        flagRemoteAccessAfterCompleted: false,
        studyAttachmentInfo: [],
        // online přístup ke zprávě: u části studií platný, u části prošlý (na vyzkoušení prodloužení)
        studyRemoteAccessInfo: reported && (pi + k) % 3 !== 2
          ? { idStudy: id, accessHash: `demo${id}`, dateValidTill: new Date(when.getTime() + ((pi + k) % 2 ? 14 : 2) * day).toISOString().slice(0, 10) }
          : undefined,
        rtgSeries: mod === "RTG" ? 2 : undefined,
      };
      list.push(s as unknown as StudyInfo);
      n++;
    }
  });
  return list.sort((a, b) => b.studyDate.localeCompare(a.studyDate));
}

/** Minimální platné PDF se zprávou (pro tlačítko „Zpráva PDF“). */
export function demoPdf(title: string, lines: string[]): Uint8Array {
  // PDF umí bez vložení fontu jen ASCII → diakritiku odstraníme
  const ascii = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[()\\]/g, "");
  const text = [`BT /F1 16 Tf 60 780 Td (${ascii(title)}) Tj ET`]
    .concat(lines.map((l, i) => `BT /F1 11 Tf 60 ${750 - i * 16} Td (${ascii(l)}) Tj ET`))
    .join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
