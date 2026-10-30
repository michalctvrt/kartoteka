# Co potřebujeme od backendu (CardFileWebWS) – souhrn pro Václava

Stav k 2026-10-29. Nová kartotéka (Next.js) volá jen REST `CardFileWebWS`, backend neměníme.
Níže je všechno, na čem nová kartotéka čeká, **seřazené podle toho, kolik práce to odblokuje**.
U každého bodu: co dnes nejde, co navrhujeme, jak to máme na frontendu obejité.

Podrobnosti k rolím jsou v [ROLE-BACKEND.md](ROLE-BACKEND.md), k vyvolávacímu systému v [../CALL250V.md](../CALL250V.md).

---

## 1. Uložení popisu studie (description) – NEJDŮLEŽITĚJŠÍ

**Dnes:** popis přes API uložit nejde vůbec – `description` není v `StudySaveBasicInfo` a jiný endpoint není.
Lékař proto píše popis v nové kartotéce a tlačítkem „Zkopírovat a otevřít ve staré kartotéce“ ho tam vkládá (Ctrl+V).

**Návrh:**
```
PUT /study/{id}/description
{ "description": "text popisu" }
→ StudyInfo  (s vyplněným dateDescriptionChanged, usernameDescriptionChanged, nameDescriptionChanged)
```
- Autor a čas popisu ať doplní backend podle přihlášeného uživatele (ne frontend).
- Smí jen role `doctor` a `admin` (jinak 403).

**Otázky:**
1. Zvyšuje se `correctionNumber`, když lékař mění už hotový popis? Má se stará verze někde uchovat?
2. Má se po uložení popisu nastavit `flagCompleted`, nebo je to samostatný krok?
3. Generuje se PDF zprávy (`/study/{id}/documentData.pdf`) z popisu hned, nebo až při dokončení?

## 2. Úprava studie – PUT /study/{id} vrací 422

**Dnes:** `PUT /study/{id}` odpoví `422 Error deserializing object from entity stream` na **jakékoli** tělo, i na `{}`
(ověřeno 2026-10-29). Formulář úprav studie máme hotový, ale vypnutý (`NEXT_PUBLIC_STUDY_EDIT_VIA_API`).

**Prosba:** opravit deserializaci, případně poslat příklad těla, které projde.

## 3. Nové vyšetření bez e-žádanky – POST /study chce ezadankaId

**Dnes:** `POST /study` vyžaduje `ezadankaId` i u vyšetření, které e-žádanku nemá (papírová žádanka, samoplátce).
Proto „Nové vyšetření“ zatím otevírá starý formulář. Nový formulář je hotový (`NEXT_PUBLIC_STUDY_VIA_API`).

**Prosba:** `ezadankaId` nepovinné.

## 4. Šablony popisu (study_description_template)

**Dnes:** šablony lékařů jsou v tabulce `study_description_template` (user_id, id_medical_service_category, name,
description, date_cr, date_edit), ale v API nejsou. Nová kartotéka má zatím **vlastní kopii** (72 šablon importovaných
ze SQL do souboru na serveru) – změny se tak nepropíšou do staré kartotéky ani zpět.

**Návrh:**
```
GET    /descriptionTemplate                → Template[]   (všechny; filtr ?userId= / ?category= vítaný)
POST   /descriptionTemplate                ← TemplateInput → Template
PUT    /descriptionTemplate/{id}           ← TemplateInput → Template
DELETE /descriptionTemplate/{id}

Template = { id, userId, userName, idMedicalServiceCategory /* RTG|UZ|MRI|null */, name, description, dateCr, dateEdit }
TemplateInput = { idMedicalServiceCategory, name, description }   // userId podle přihlášeného
```
- Upravit / smazat smí autor a admin. Číst všichni lékaři (lékařky si šablony půjčují).
- Na frontendu máme navíc pole `shortcut` (zkratka) – není nutné, klidně vynechat.

## 5. Vyhledání nepopsaných studií

**Dnes:** pracovní seznam lékaře „K popisu“ potřebuje studie **bez popisu**. `StudyBrowseFilter` nemá `description`,
takže načítáme všechny studie za období (až 500) a nepopsané vybíráme na frontendu.
Zkusili jsme `usernameDescriptionChanged IS_NULL` – na testovacích datech nešlo ověřit (obě studie jsou popsané).

**Prosba:** potvrdit, že `usernameDescriptionChanged IS_NULL` = studie bez popisu, nebo přidat do filtru
`description` (IS_NULL / IS_NOT_NULL) či `flagDescribed`.

## 6. Přihlášený uživatel a role – GET /me, /staff

**Dnes:** přihlášení v nové kartotéce je jen SIMULACE (výběr zaměstnance). Celé zadání je v [ROLE-BACKEND.md](ROLE-BACKEND.md):
- `GET /me` (podle SSO cookie), `GET/POST/PATCH /staff`,
- role `laborant` v backendu chybí,
- **kontrola oprávnění na backendu** – frontend jen schovává tlačítka.

## 7. Číslo lístku vyvolávacího systému ve studii

**Dnes:** lístek z Call250V propojujeme s pacientem přes rodné číslo (`externalIdentifier`). Pro dohledání návštěvy
(a pro statistiky čekání) by pomohl sloupec ve `study`, např. `queueTicket` (text, nepovinný), ukládaný při `POST /study`.

## 8. e-Žádanky

**Dnes:** endpointy `/ezadanka/by-rid/{rid}` a `/ezadanka/by-kod/{kod}` máme jen jako simulaci.
Kontrakt (tvar JSON) je v `lib/ezadanka/types.ts`. Čekáme na Java verzi.

## 9. Produkční nasazení – rozhodnuto: statický web v EARu

Podrobně v [PRODUKCE.md](PRODUKCE.md): co ode mě dostaneš (složka `out/`), nastavení pobočky (`config.js`)
a seznam „mostů“, které musí udělat Java (vyvolávací systém, zaměstnanci, šablony, SuperSaaS, VZP, provozní aplikace).

---

### Drobnosti, které se hodí vědět

- Datum ve `browseFilter.studyDate` posíláme jako ISO s časovou zónou (`2026-10-19T00:00:00+02:00`), jinak backend
  porovnává v UTC. Pokud je to záměr, v pořádku – jen ať o tom víme oba.
- Generátor klienta (`openapi-typescript-codegen`) čísluje metody podle pořadí ve swaggeru (`search4`, `findById5`…).
  Když se pořadí ve swaggeru změní, rozbije se nám to – stačí dát vědět, přegenerujeme.
