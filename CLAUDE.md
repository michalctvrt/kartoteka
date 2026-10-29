# Kartotéka 2.0 – DC Flipper

Nové UI kartotéky radiodiagnostické firmy DC-FLIPPER s.r.o. (Brno, pobočky Lesná,
Dobrovského, Vídeňská + nová Olomoucká 7 s MRI). Píše se postupně jako náhrada staré
JSF kartotéky. Komunikace s uživatelem (Michal) **česky**; Michal zná JS, backend/Java ne.

## Stack a běh
- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 3, lucide-react, Radix dialog
- Dev: `npm run dev` → http://localhost:4001 (test server TESTSERVER, složka `/var/www/cftest.dc-flipper.cz/m`)
- Kontroly: `npx tsc --noEmit`, `npx eslint <soubory>` (pár starých lint chyb v layoutu/aktualitách/pacientech už existovalo)
- Větev s rozpracovanou prací: `call250v`

## Backend (Václav – Java/Payara, NEMĚNÍME, jen voláme)
- REST `CardFileWebWS` na `http://localhost:8080/CardFileWebWS/rest`, swagger `app/api/openapi-original.json`
  (kopie `openapi-fixed.json` má doplněný `info` blok pro generátor)
- Klient generovaný `openapi-typescript-codegen` do `lib/api/generated/` – **pozor**: generátor čísluje
  metody (`findById1`, `search4`…) podle pořadí ve swaggeru; po přegenerování ověřit, že volání míří na správné URL.
  Ručně upravené: `core/OpenAPI.ts` (BASE = `/api/cardfile/rest`) a `services/ezadanka.ts` – zachovat.
- Dev proxy `app/api/cardfile/[...path]` přidává cookie `BACKEND_DEV_COOKIE` z `.env.local`
  (JSESSIONIDSSO + JSESSIONID z přihlášení na `localhost:8080/CFLocalSyncWeb`). 401 = cookie vypršela.
- Stará JSF kartotéka: `lib/legacy.ts` (`edit.xhtml?sid=` pro otevření studie – parametr je `sid`, ne `id`;
  `edit.xhtml?pid=` = nové vyšetření s předvyplněným pacientem)
- Známé limity backendu: `POST /study` vyžaduje `ezadankaId` i bez e-žádanky (čeká na Václava) →
  „Nové vyšetření“ zatím otevírá starý formulář; nový formulář (`components/study/`) se zapne
  `NEXT_PUBLIC_STUDY_VIA_API=1`. `idWorkingplace` z `NEXT_PUBLIC_WORKINGPLACE`.
- Produkce: rozcestník `cftest.dc-flipper.cz`, Apache; nové UI má být pod `/CFLocalSyncWeb/m` nebo v EARu.
  Václav preferuje statické HTML+JS → Next API routes by v produkci nebyly. Nerozhodnuto.

## Vyvolávací systém Call250V (Kadlec elektronika) – pobočka Olomoucká
Podrobně `CALL250V.md`. Shrnutí:
- Kiosk → lístek s QR → recepce vyvolá → karta + vyšetření → čekárna RTG/UZ/MRI → laborant vyvolá
  k dveřím → „Hotovo →“ další modalita / recepce (zpráva) → `complete` až na konci návštěvy.
- `lib/call250v/` (server klient s Api-Key jen na serveru, simulátor `mock.ts` když chybí `CALL250V_BASE_URL`,
  `config.ts` = ID činností A1–A7 a pultů P1–P7 – **odhad, přepsat podle Kadlece**)
- `app/api/queue/*` API routes; `components/queue/*` UI; `useQueue` sdílí jedno načítání pro všechna okna.
- Otevřené otázky na Kadlece/Václava: obsah QR, chování po PATCH (stav, pořadí), counter busy (409),
  sloupec s číslem lístku ve `study` (Michal o něj žádá Václava).

## Plocha (dashboard) – `components/dashboard/`
- react-grid-layout 1.5.3, 12 sloupců; povolené šířky/výšky v `grid.ts` (WIDTHS/HEIGHTS)
- Žádné odsouvání (`compactType=null`, `allowOverlap`), kolize řešíme sami: přizpůsobení mezeře (`fitAt`),
  vmáčknutí mezi okna (`makeRoom`), návrat když se nevejde; po každé změně `normalize` (žádné překryvy).
- Mřížka si drží vlastní kopii layoutu → předáváme layout s `_v` (verze), NE remount (`key`) – remount
  způsoboval poskakování oken. `measureBeforeMount` NEPOUŽÍVAT (rozbije pozice).
- Okna měří svou velikost (`useElementSize`) a mají podobu S/M/L (`size.ts`) jako widgety v iPhonu.
  Čekárny: kompaktní řádky, ukazují kolik se vejde, zbytek „+ N dalších“, nikdy posuvník.
- Rozložení v localStorage `kartoteka_dashboard_v1_<role>` (role: reception / lab / doctor).

## Vzhled (brand)
- Logo `public/logo.svg` (+ `logo-dark.svg`), favicon delfín, písmo Montserrat
- Barvy `brand-50…950` v `tailwind.config.js` (z loga, hlavní #126c8b); modalita RTG oranžová,
  UZ sky, MRI fialová (`MODALITY_STYLE` ve `WaitingBoard.tsx`)

## Design (styl „rám a list“, framed-sheet z taste skillu, 2026-10-29)
- Tokeny v `styles/globals.css` (`--ui-*`), v Tailwindu jako `ui-frame/sheet/raised/active/line/rule/control/ink/muted/faint/primary`.
  Pro text používat `text-ui-ink|muted|faint` (≥ 4.5:1), ne `text-gray-*`.
- Shell `app/(dashboard)/layout.tsx` + menu `components/AppNav.tsx`: rám v tónu brand-50, obsah na bílém listu
  (16px rohy, bez stínu), lišta 48px s frontou. Pod 1024px menu za tlačítkem.
- Barva brandu jen na logu, jedné primární akci (`Button` default = brand-700) a vybraném stavu. Modality nesou
  data (RTG/UZ/MRI) – na čekárnách jen 3px horní hrana a světlé štítky, nic neblikat (`animate-pulse` ne).
- Žádné stíny na klidných kartách, jeden poloměr `rounded-lg`, žádné emoji, každá obrazovka má jeden `h1`.

## Studie
- `lib/studies.ts` – hledání (číslo studie / RČ / příjmení → pacienti → `pid IN`), formátování.
  Datum do `browseFilter.studyDate` posílat jako ISO s časovou zónou (backend jinak porovnává v UTC).
- `reception/studies/search` (vyhledávání), `reception/studies/[sid]` (karta studie, jen čtení; popis = `description`,
  PDF = `/study/{id}/documentData.pdf`, úpravy zatím ve staré kartotéce). Menu „Karta studie“ = naposledy otevřená.
- Úprava studie: `components/study/StudyEditForm.tsx` (PUT /study/{id}), zapíná se `NEXT_PUBLIC_STUDY_EDIT_VIA_API=1`.
  Zatím vypnuto: backend vrací 422 „Error deserializing object from entity stream“ na jakékoli tělo (i `{}`).
  Popis (`description`) v StudySaveBasicInfo není → přes API nejde upravit vůbec (čeká na Václava).

## Jak pracovat
- Michal chce věcné odpovědi a hotové, ověřené výsledky. Po změnách UI ověřit v prohlížeči
  (Playwright je k dispozici přes npx), u plochy kontrolovat skutečné polohy oken v DOM (ne jen uložená data).
- Nevymýšlet si chování Call250V ani backendu – označit jako předpoklad a zeptat se.
- Necommitovat `.env.local` (obsahuje klíče).
- Skill `design-taste-frontend` (taste skill) používat JEN když o něj Michal výslovně požádá, ne při běžných
  úpravách UI. I pak držet náš brand (Montserrat, barvy `brand-*`, logo) a stávající plochu – jeho
  vlastní paleta/písmo/zákazy (stíny, linky, karty) mají přednost až po souhlasu.
