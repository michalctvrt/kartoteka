/**
 * Vzorové šablony popisu pro demo / první spuštění (smyšlené obecné texty, bez jmen).
 * Skutečné šablony lékařů jsou jen v .data/templates.json na serveru (mimo git).
 */
import type { ReportTemplate } from "@/lib/templates/types";

type Seed = Omit<ReportTemplate, "id" | "createdAt" | "updatedAt">;
const t = (modality: string, name: string, shortcut: string | null, text: string): Seed => ({
  owner: null,
  ownerName: "Vzorové šablony",
  modality,
  name,
  shortcut,
  text,
  legacyId: null,
});

export const DEMO_TEMPLATES: Seed[] = [
  t("RTG", "RTG srdce a plic – norma", "rtgs", `RTG srdce a plic – ZP projekce:

Plicní křídla rozvinuta do periferie.
Bronchovaskulární kresba přiměřená.
Plicní parenchym bez ložiskových či infiltrativních změn.
Bránice hladká, klenutá, kostofrenické úhly volné.
Hily nezvětšené, srdeční stín přiměřené šíře.

Res: RTG nitrohrudních orgánů v normě.`),
  t("RTG", "RTG – bez traumatických změn", "rtgneg", "Zobrazený skelet bez zřetelných traumatických či jiných patologických změn."),
  t("RTG", "RTG LS páteře", "rtgls", `RTG LS páteře v základních projekcích:

Osa páteře bez výraznějšího vybočení.
Plynulá bederní lordóza.
Obratlová těla bez kompresí či posunů.
Meziobratlové prostory přiměřené šíře.

Res: `),
  t("RTG", "RTG kolena", "rtgkol", `RTG kolenního kloubu:

Artikulační postavení správné. Kloubní štěrbiny přiměřené šíře, kloubní plochy hladké.
Kostní struktura pravidelná.

Res: `),
  t("RTG", "1. snímek – bez srovnání", "prvni", "1. snímek u nás, bez možnosti srovnání."),
  t("UZ", "UZ břicha – norma", "uzb", `UZ břicha:

Játra nezvětšená, homogenní, bez ložiskových změn.
Žlučník s anechogenním obsahem, stěna nezesílena. Žlučové cesty bez dilatace.
Pankreas v přehledné části bez ložiskových změn.
Slezina nezvětšená.
Ledviny ortotopní, symetrické, bez dilatace KPS, bez konkrementů.
Močový měchýř s anechogenním obsahem.
Bez volné tekutiny v dutině břišní.

Res: UZ obraz břicha v normě.`),
  t("UZ", "UZ štítné žlázy", "uzsz", `UZ štítné žlázy:

Oba laloky ostře ohraničené, homogenní echostruktury, bez uzlů.
Vaskularizace přiměřená. V okolí bez lymfadenopatie.

Res: UZ štítné žlázy v normě.`),
  t("UZ", "UZ krku – lymfatické uzliny", "uzlu", "Všechny LU se zachovalým L/T indexem, s typickým centrálním hyperechem, s pólovou vaskularizací, dle UZ benigního vzhledu."),
  t("UZ", "UZ žil DKK – bez trombózy", "uzzil", `Doppler žil DKK:

Hluboký a povrchový žilní systém volně průchodný, plně kompresibilní.
Augmentační manévry vedou k akceleraci toku.

Res: Bez známek trombózy hlubokých žil dolních končetin.`),
  t("MRI", "MR – závěr bez patologie", "mrneg", "Závěr: Bez průkazu patologických změn ve vyšetřované oblasti."),
];
