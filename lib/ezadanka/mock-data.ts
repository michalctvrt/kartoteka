/**
 * Mock data pro vývoj eŽádanky UI.
 *
 * Až Václav dodá Java endpointy `/CardFileWebWS/rest/ezadanka/*`, tato
 * data nahrazujeme reálnou odpovědí. Struktury přesně odpovídají
 * `lib/ezadanka/types.ts` — kontraktu, který Václav implementuje.
 *
 * Scénář: pacient Roman Č. (RČ 9882826031) má 2 aktivní žádanky:
 *   - RTG koleno (rutinní) — uděláme dnes
 *   - SONO břicho (rutinní) — objednáme na 2 týdny
 */

import type { ZadankaDetail, ZadankaListItem } from "./types";

// ─── List items (krátký přehled pro tabulku) ─────────────────────────────

export const MOCK_LIST_ITEMS: Record<string, ZadankaListItem[]> = {
  // Roman Čtvrtníček — 2 aktivní žádanky
  "9882826031": [
    {
      kod: "RNYC3TWF",
      id: "79938fda-2e4a-473c-8862-5d6ab3e4334c",
      stav: { kod: "0", nazev: "Nová" },
      urgentnost: { kod: "1", nazev: "rutinní" },
      datumVytvoreni: "2026-04-28T08:30:00",
      typ: "žádanka o zobrazovací vyšetření",
      modalita: "RTG",
      vysetreniNazev: "RTG snímek (DX) koleno vpravo",
      pacient: {
        rid: "9882826031",
        jmeno: "Roman",
        prijmeni: "Čtvrtníček",
      },
      zadatel: "MEDIGRAFO s.r.o.",
    },
    {
      kod: "ABCD1234",
      id: "11111111-2222-3333-4444-555555555555",
      stav: { kod: "0", nazev: "Nová" },
      urgentnost: { kod: "1", nazev: "rutinní" },
      datumVytvoreni: "2026-04-29T09:15:00",
      typ: "žádanka o zobrazovací vyšetření",
      modalita: "SONO",
      vysetreniNazev: "UZ břicha — komplexní vyšetření",
      pacient: {
        rid: "9882826031",
        jmeno: "Roman",
        prijmeni: "Čtvrtníček",
      },
      zadatel: "Ordinace MUDr. Nováková",
    },
  ],

  // Eva Dvořáková (z mock dat existujícího patient seznamu) — 1 urgentní žádanka
  "9007082222": [
    {
      kod: "URGNT123",
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      stav: { kod: "0", nazev: "Nová" },
      urgentnost: { kod: "3", nazev: "statim" },
      datumVytvoreni: "2026-04-29T07:00:00",
      typ: "žádanka o zobrazovací vyšetření",
      modalita: "CT",
      vysetreniNazev: "CT břicho — STATIM",
      pacient: {
        rid: "9007082222",
        jmeno: "Eva",
        prijmeni: "Dvořáková",
      },
      zadatel: "Pohotovost FN Brno",
    },
  ],

  // 8001011234 = mock RČ z e-žádanky API route (původní mock test pro nového pacienta,
  // co ještě v kartotéce není — sdílíme s app/api/ezadanka/[id]/route.ts)
  "8001011234": [
    {
      kod: "NEWPT001",
      id: "ffba88cf-b721-4aff-b7bc-91167899b3bb",
      stav: { kod: "0", nazev: "Nová" },
      urgentnost: { kod: "1", nazev: "rutinní" },
      datumVytvoreni: "2026-04-29T10:00:00",
      typ: "žádanka o zobrazovací vyšetření",
      modalita: "RTG",
      vysetreniNazev: "RTG hrudník PA",
      pacient: {
        rid: "8001011234",
        jmeno: "Jan",
        prijmeni: "Novák",
      },
      zadatel: "Praktický lékař MUDr. Svoboda",
    },
  ],
};

// ─── Detaily (po kliknutí na řádek) ──────────────────────────────────────

export const MOCK_DETAILS: Record<string, ZadankaDetail> = {
  RNYC3TWF: {
    kod: "RNYC3TWF",
    id: "79938fda-2e4a-473c-8862-5d6ab3e4334c",
    stav: { kod: "0", nazev: "Nová" },
    urgentnost: { kod: "1", nazev: "rutinní" },
    datumVytvoreni: "2026-04-28T08:30:00",
    typ: "žádanka o zobrazovací vyšetření",

    pacient: {
      rid: "9882826031",
      jmeno: "Roman",
      prijmeni: "Čtvrtníček",
      datumNarozeni: "1969-11-10",
      pohlavi: "MALE",
      cisloPojistence: "6911103815",
      pojistovnaKod: "207",
      pojistovnaNazev: "Oborová zdravotní pojišťovna zaměstnanců bank",
      adresa: "Brno, Šimáčkova 1678",
      email: "rctvrtnicek@gmail.com",
      telefon: null,
    },
    zadatel: {
      jmeno: "MUDr. Jana Neugebauerová",
      poskytovatel: "MEDIGRAFO s.r.o.",
      ico: "29224012",
      icp: "29224012",
    },
    vysetreni: {
      nazev: "RTG snímek (DX) koleno vpravo",
      modalita: "RTG",
      castTela: "koleno",
      lateralita: "vpravo",
      poznamka: null,
      instrukceProPacienta: null,
    },
    diagnoza: {
      kod: "M255",
      nazev: "Bolest v kloubu",
      klinickaOtazka: "Bolest - v koleni",
    },
    pacientStav: {
      omezeniMobility: "chodící",
      popisOmezeniMobility: null,
      vyska: "191 CM",
      vaha: "112 KG",
      implantat: false,
      samoplatce: false,
    },
    uhrada: "zdravotní pojištění",
  },

  ABCD1234: {
    kod: "ABCD1234",
    id: "11111111-2222-3333-4444-555555555555",
    stav: { kod: "0", nazev: "Nová" },
    urgentnost: { kod: "1", nazev: "rutinní" },
    datumVytvoreni: "2026-04-29T09:15:00",
    typ: "žádanka o zobrazovací vyšetření",

    pacient: {
      rid: "9882826031",
      jmeno: "Roman",
      prijmeni: "Čtvrtníček",
      datumNarozeni: "1969-11-10",
      pohlavi: "MALE",
      cisloPojistence: "6911103815",
      pojistovnaKod: "207",
      pojistovnaNazev: "Oborová zdravotní pojišťovna zaměstnanců bank",
      adresa: "Brno, Šimáčkova 1678",
      email: "rctvrtnicek@gmail.com",
      telefon: null,
    },
    zadatel: {
      jmeno: "MUDr. Petra Nováková",
      poskytovatel: "Ordinace MUDr. Nováková",
      ico: "12345678",
      icp: "12345678",
    },
    vysetreni: {
      nazev: "UZ břicha — komplexní vyšetření",
      modalita: "SONO",
      castTela: "břicho",
      lateralita: null,
      poznamka: "vyloučit cholecystolithiasu",
      instrukceProPacienta: "Pacient přijde nalačno (min. 8 hodin bez jídla a pití).",
    },
    diagnoza: {
      kod: "R109",
      nazev: "Bolest v břiše blíže neurčená",
      klinickaOtazka: "Bolesti v pravém podžebří, podezření na žlučové kameny.",
    },
    pacientStav: {
      omezeniMobility: "chodící",
      popisOmezeniMobility: null,
      vyska: "191 CM",
      vaha: "112 KG",
      implantat: false,
      samoplatce: false,
    },
    uhrada: "zdravotní pojištění",
  },

  URGNT123: {
    kod: "URGNT123",
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    stav: { kod: "0", nazev: "Nová" },
    urgentnost: { kod: "3", nazev: "statim" },
    datumVytvoreni: "2026-04-29T07:00:00",
    typ: "žádanka o zobrazovací vyšetření",

    pacient: {
      rid: "9007082222",
      jmeno: "Eva",
      prijmeni: "Dvořáková",
      datumNarozeni: "1990-07-08",
      pohlavi: "FEMALE",
      cisloPojistence: "9007082222",
      pojistovnaKod: "111",
      pojistovnaNazev: "Všeobecná zdravotní pojišťovna",
      adresa: "Brno, Cejl 12",
      email: null,
      telefon: "+420 605 555 333",
    },
    zadatel: {
      jmeno: "MUDr. Tomáš Procházka",
      poskytovatel: "Pohotovost FN Brno",
      ico: "65269705",
      icp: "65269705",
    },
    vysetreni: {
      nazev: "CT břicho — STATIM",
      modalita: "CT",
      castTela: "břicho",
      lateralita: null,
      poznamka: "Při příjmu acutum náhlá bolest. Volat zpět ihned.",
      instrukceProPacienta: null,
    },
    diagnoza: {
      kod: "K359",
      nazev: "Akutní apendicitida blíže neurčená",
      klinickaOtazka: "Vyloučit perforaci.",
    },
    pacientStav: {
      omezeniMobility: "ležící",
      popisOmezeniMobility: "akutní bolest, nemůže se postavit",
      vyska: "170 CM",
      vaha: "64 KG",
      implantat: false,
      samoplatce: false,
    },
    uhrada: "zdravotní pojištění",
  },

  NEWPT001: {
    kod: "NEWPT001",
    id: "ffba88cf-b721-4aff-b7bc-91167899b3bb",
    stav: { kod: "0", nazev: "Nová" },
    urgentnost: { kod: "1", nazev: "rutinní" },
    datumVytvoreni: "2026-04-29T10:00:00",
    typ: "žádanka o zobrazovací vyšetření",

    pacient: {
      rid: "8001011234",
      jmeno: "Jan",
      prijmeni: "Novák",
      datumNarozeni: "1980-01-01",
      pohlavi: "MALE",
      cisloPojistence: "8001011234",
      pojistovnaKod: "111",
      pojistovnaNazev: "Všeobecná zdravotní pojišťovna",
      adresa: "Brno, Hlavní 42",
      email: "jan.novak@test.cz",
      telefon: "+420 777 123 456",
    },
    zadatel: {
      jmeno: "MUDr. Pavel Svoboda",
      poskytovatel: "Praktický lékař MUDr. Svoboda",
      ico: "11111111",
      icp: "11111111",
    },
    vysetreni: {
      nazev: "RTG hrudník PA",
      modalita: "RTG",
      castTela: "hrudník",
      lateralita: null,
      poznamka: null,
      instrukceProPacienta: null,
    },
    diagnoza: {
      kod: "J189",
      nazev: "Pneumonie blíže neurčená",
      klinickaOtazka: "Podezření na pneumonii — kontrolní snímek.",
    },
    pacientStav: {
      omezeniMobility: "chodící",
      popisOmezeniMobility: null,
      vyska: null,
      vaha: null,
      implantat: false,
      samoplatce: false,
    },
    uhrada: "zdravotní pojištění",
  },
};
