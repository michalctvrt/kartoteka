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
- **Vše, na co čekáme, je v `docs/VACLAV.md`** (seřazené podle priority) – nový požadavek na backend zapsat tam.
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
- **Produkce = STATICKÝ WEB v Václavově EARu** (rozhodnuto 2026-10-30; kartotéka běží na lokálních serverech poboček,
  musí jet i bez internetu). Návod a seznam „mostů“ pro Václava: `docs/PRODUKCE.md` (psáno Michalovým hlasem – tak to i
  udržovat). `npm run build:static` (STATIC_EXPORT=1, NEXT_BASE_PATH) → `out/`; app/api se do něj nesestaví (pageExtensions tsx).
  Pravidla, aby statický web fungoval:
  - adresy mostů jen přes `bridge("…")` a REST přes `runtimeConfig.apiBase` (`lib/runtimeConfig.ts`), nikdy natvrdo `/api/…`;
  - nastavení pobočky za běhu z `config.js` (`window.__KARTOTEKA__`), ne `NEXT_PUBLIC_*`;
  - žádné stránky s `[param]` – karty jsou `/reception/patients/card?pid=`, `/reception/studies/card?sid=` (`lib/routes.ts`);
  - porovnávat adresy přes `usePath()` (bez koncového lomítka), obrázky z public s `BASE_PATH`;
  - nic z internetu (písmo přes next/font, přibalené).

## Demo režim (doma, bez firemní sítě)
- `DEMO_MODE=1` v `.env.local` → `app/api/cardfile/[...path]` odpovídá z `lib/demo/backend.ts` (smyšlení pacienti
  a studie v paměti, filtry jako backend), SuperSaaS z `lib/demo/bookings.ts`. Návod pro domácí PC: `docs/DOMA.md`.
  Nový endpoint, který frontend začne volat, je potřeba doplnit i do demo backendu.

## Vyvolávací systém Call250V (Kadlec elektronika) – pobočka Olomoucká
Podrobně `CALL250V.md`. Shrnutí:
- Kiosk (jen „Na vyšetření“ / „Objednat se“, bez modality) → lístek s QR → recepce vyvolá → karta + vyšetření → čekárna RTG/UZ/MRI → laborant vyvolá
  k dveřím → „Hotovo →“ další modalita / recepce (zpráva) → `complete` až na konci návštěvy.
- `lib/call250v/` (server klient s Api-Key jen na serveru, simulátor `mock.ts` když chybí `CALL250V_BASE_URL`,
  `config.ts` = ID činností A1–A7 a pultů P1–P7 – **odhad, přepsat podle Kadlece**)
- `app/api/queue/*` API routes; `components/queue/*` UI; `useQueue` sdílí jedno načítání pro všechna okna.
- Otevřené otázky na Kadlece/Václava: obsah QR, chování po PATCH (stav, pořadí), counter busy (409),
  sloupec s číslem lístku ve `study` (Michal o něj žádá Václava).

## Plocha (dashboard) – `components/dashboard/`
- react-grid-layout 1.5.4 (1.5.3 obsahoval cizí soubory vč. binárky ip_fetcher), 12 sloupců; povolené šířky/výšky v `grid.ts` (WIDTHS/HEIGHTS)
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
- Michal chce (2026-10-29): border-monochrome (1px linka, žádný stín POD kartou), bento rozložení
  (hlavní věc 2 sloupce, vedlejší 1), kontextová hustota (prázdná nepovinná pole skrýt), jemné hmatové detaily
  a dynamiku. Prvky: `components/ui/bento.tsx` (Bento, BentoTile, Metric, DataRow), `components/ui/skeleton.tsx`
  (Skeleton = načítání pulzuje, Ghost = prázdný stav v klidu + sr-only text), CSS `.ui-tile` `.ui-input` `.ui-press`.
- Pohyb (framer-motion): dlaždice se rozevřou od levého horního rohu postupně (`index`), stránky se prolnou
  (`app/(dashboard)/template.tsx`), zvýraznění menu přejede (`layoutId`). `MotionConfig reducedMotion="user"`.
- Karta pacienta = bento z `components/patient/*`; lístek (2 sl.) → bez lístku místo něj poslední vyšetření.
- Tento styl platí pro VŠECHNY obrazovky (i nové). Sdílené: `components/ui/segmented.tsx` (přepínač s přejíždějícím
  výběrem), `components/study/StudyList.tsx` (řádky studií – karta pacienta i vyhledávání), `components/study/StudyTiles.tsx`
  (karta studie: popis 2×2, pacient, žádanka, výkony, záznam, přílohy jen když jsou).

## Role a oprávnění (2026-10-29)
- Role admin / reception (backend „administrativa“) / lab (v backendu chybí) / doctor = PŘEDVOLBY. Oprávnění JEN v
  `lib/auth/roles.ts` (`CAPABILITIES` – id, skupina, popis, výchozí role; i okna plochy `widget.*`). Admin u zaměstnance
  přidá/odebere jednotlivá oprávnění (`grants`/`denies`, ukládají se jen odchylky); skutečná = `effectiveCaps()`. V UI `useSession().can("…")` / `<Can cap>` z `components/auth/SessionProvider.tsx`.
- Přihlášení je ZATÍM SIMULACE: `/login` = výběr zaměstnance, seznam v `app/api/staff` (soubor `.data/staff.json`, mimo git).
  Správa: `/admin/staff`. Zadání pro Václava: `docs/ROLE-BACKEND.md` (GET /me, /staff, kontrola oprávnění na backendu).
- Frontend jen schovává – skutečná ochrana musí být na backendu.

## Nastavení (`/settings`)
- Bento: Toto pracoviště (pult recepce, operátor Call250V, pracoviště pro nová vyšetření – localStorage tohoto PC),
  Vzhled (`lib/prefs.ts`: téma světlé/tmavé/podle systému, animace plné/omezené → `html[data-motion]` + MotionConfig),
  Plocha (obnovit výchozí rozložení), Stav systému (`app/api/status`), Můj účet (role a skutečná oprávnění).
- Sekce podle oprávnění; ukládá se hned, bez tlačítka Uložit.

## Kalendář objednávek (`/reception/calendar`)
- Vlastní (react-big-calendar odstraněn): `components/calendar/useBookings.ts` (SuperSaaS, rozvrh UZ Vídeňská),
  `TimeGrid.tsx` (Den/Týden, souběžné vedle sebe, čára „teď“, blok ≥ 3 h = blokace šrafovaně).
- Bento: Dnes (2 sl.), Další na řadě, Tento týden; kalendář (3 sl.) + detail (bez výběru = další na řadě),
  „Vyhledat v kartotéce“ → `/reception/patients?q=jméno`. Šipky ← → posouvají den/týden.

## Funkce z provozní aplikace `/opt/testapp` (OSTRÝ PROVOZ – nic tam neměnit)
- Přebíráme postupně podle `docs/TESTAPP.md` (stav, API, spec spotřebního materiálu). Data přes jeho backend:
  brána `app/api/ops/[...path]` → `TESTAPP_API_URL` (jen v .env.local), jen povolené cesty (ALLOW),
  demo odpovědi `lib/demo/ops.ts`. Zápisy do jeho dat (prodloužení přístupu, objednávky) netestovat bez souhlasu.
- Hotovo: hromadný tisk `/reception/print` (`print.batch`); ověření pojištění v dlaždici Pojišťovna
  (`insurance.check`, `lib/ops/vzp.ts`, VZP_API_URL + VZP_CONNECT_HOST, chybějící mezilehlý cert v `certs/`); online přístup ke zprávě na kartě studie (`remoteAccess.extend`).
  Připojení lékaři `/reception/doctors` (`doctors.view`). Spotřební materiál `/supplies` (`supplies.order|summary|catalog`):
  na ostrých datech JEN ČTENÍ – zápis i GET /order (zakládá objednávku) blokuje brána (423), dokud není SPOTREBA_WRITE=1.
  NIKDY nezapínat bez souhlasu Michala (konec měsíce = potvrzování objednávek poboček).

## Studie
- `lib/studies.ts` – hledání (číslo studie / RČ / příjmení → pacienti → `pid IN`), formátování.
  Datum do `browseFilter.studyDate` posílat jako ISO s časovou zónou (backend jinak porovnává v UTC).
- `reception/studies/search` (vyhledávání), `reception/studies/card?sid=` (karta studie, jen čtení; popis = `description`,
  PDF = `/study/{id}/documentData.pdf`, úpravy zatím ve staré kartotéce). Menu „Karta studie“ = naposledy otevřená.
- Úprava studie: `components/study/StudyEditForm.tsx` (PUT /study/{id}), zapíná se `NEXT_PUBLIC_STUDY_EDIT_VIA_API=1`.
  Zatím vypnuto: backend vrací 422 „Error deserializing object from entity stream“ na jakékoli tělo (i `{}`).
  Popis (`description`) v StudySaveBasicInfo není → přes API nejde upravit vůbec (čeká na Václava).
- Psaní popisu: `components/study/ReportEditor.tsx` (karta studie → „Popsat / Upravit popis“, `?write=1` = rovnou psát):
  krémový papír `.ui-paper` + psací linky `.ui-paper-lines` (Michalovi bílá oslňovala; řádkování VŽDY 1,75em – linky na něm
  závisí), řádek max 72 znaků, písmo S/M/L (`lib/prefs.ts` `reportSize`, i Nastavení → Vzhled), koncept v localStorage
  `report-draft:<id>`. Uložení zatím „Zkopírovat a otevřít ve staré kartotéce“. Vedle panel Šablony / Předchozí / Pacient.
- Pracovní seznam `/doctor/reports` „K popisu“ (`report.write`): nepopsané studie za období (backend filtr „bez popisu“ nemá →
  `lib/reportQueue.ts` filtruje sám), urgentní a nejstarší nahoře; fronta v sessionStorage → „Další na řadě“ v psaní.
  Na ploše lékaře okno „K popisu“ (`components/study/ToReportWidget.tsx`, `widget.toReport`), filtr sdílí se stránkou (`useReportFilter`).
- Šablony popisu: backend je přes API nemá (stará kartotéka: tabulka `study_description_template`) → SIMULACE
  `app/api/templates` + `.data/templates.json` (mimo git; na serveru 72 šablon ze staré kartotéky importovaných z Michalova SQL,
  bez souboru se založí vzorové `lib/demo/templates.ts`). Vložení: panel (celá / označená část), „//“ + název, zkratka + Tab.

## Jak pracovat
- Michal chce věcné odpovědi a hotové, ověřené výsledky. Po změnách UI ověřit v prohlížeči
  (Playwright je k dispozici přes npx), u plochy kontrolovat skutečné polohy oken v DOM (ne jen uložená data).
- Nevymýšlet si chování Call250V ani backendu – označit jako předpoklad a zeptat se.
- Necommitovat `.env.local` (obsahuje klíče).
- Skill `design-taste-frontend` (taste skill) používat JEN když o něj Michal výslovně požádá, ne při běžných
  úpravách UI. I pak držet náš brand (Montserrat, barvy `brand-*`, logo) a stávající plochu – jeho
  vlastní paleta/písmo/zákazy (stíny, linky, karty) mají přednost až po souhlasu.
