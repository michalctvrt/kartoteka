# Nová kartotéka v produkci – jako statický web v EARu

Václave, jak jsme se bavili: nová kartotéka poběží jako statický web, přibalený do tvého EARu,
na stejném lokálním serveru jako stará kartotéka. Takže když vypadne internet, poběží dál,
stejně jako tvoje kartotéka. Na serverech poboček se nic nového instalovat nemusí (žádný Node.js).

Já nejsem javista, tak jsem to sepsal tak, jak tomu rozumím já. Kdyby něco nedávalo smysl
nebo to chceš udělat jinak, napiš a přizpůsobím frontend.

---

## 1. Co ode mě dostaneš

Já spustím:

```
NEXT_BASE_PATH=/CFLocalSyncWeb/m npm run build:static
```

a vznikne složka **`out/`** (asi 4 MB) – jen obyčejné soubory: HTML, JavaScript, CSS, obrázky, písmo.
Žádný server, nic se nespouští.

- Každá stránka je složka s `index.html` (např. `out/reception/patients/card/index.html`),
  takže stačí, aby Payara u adresy končící `/` vrátila `index.html` (welcome file).
- Písmo je přibalené, aplikace nic nestahuje z internetu.
- `NEXT_BASE_PATH` = pod jakou adresou to poběží. Dal jsem `/CFLocalSyncWeb/m`, ale je to na tobě –
  jen mi řekni jakou, protože se zapisuje při sestavení.

**Kam s tím:** obsah `out/` dát do webového modulu tak, aby byl vidět pod tou adresou
(např. `src/main/webapp/m/` ve `CFLocalSyncWeb`), a pak klasicky sestavit EAR.
Jestli chceš, dá se sestavení frontendu spouštět rovnou z Mavenu (frontend-maven-plugin),
ale klidně ti zatím budu posílat hotovou složku.

Přihlášení: protože stránky poběží na stejném serveru a stejné adrese jako tvoje API,
prohlížeč posílá stejnou SSO cookie. Takže by se stránky měly chránit stejně jako stará kartotéka
(security constraint na `/m/*`) a API ví, kdo volá.

## 2. Nastavení pobočky – soubor `config.js`

Sestavení je pro všechny pobočky stejné. Co se liší, je v souboru **`config.js`** vedle aplikace
(ve složce `out/` je vzor). Načte se dřív než aplikace. Na pobočce se upraví jen tenhle soubor:

```js
window.__KARTOTEKA__ = {
  apiBase: "/CardFileWebWS/rest",        // tvoje REST API
  bridgeBase: "/CardFileWebWS/rest/m",   // „mosty“ – viz bod 3 (adresu klidně změň, jen mi napiš)
  legacyBaseUrl: "",                     // stará kartotéka – prázdné = stejný server
  workingplace: "OLOM",                  // pracoviště pro nová vyšetření (kód z /workingplace)
  studyViaApi: false,                    // nový formulář vyšetření (až půjde POST /study bez ezadankaId)
  studyEditViaApi: false,                // nová úprava studie (až půjde PUT /study/{id})
};
```

Jestli by ti víc vyhovovalo, aby si to aplikace brala z tvého API (třeba z `/configuration`),
taky to jde, jen se domluvíme na tvaru.

## 3. „Mosty“ – co musí udělat Java

Teď na testovacím serveru běží kartotéka i se svou serverovou částí v Node, která dělá pár věcí,
co v prohlížeči být nesmí (hlavně kvůli klíčům a heslům). Ve statickém webu nic takového není,
takže to potřebuju od tebe. Frontend všechno volá jako `bridgeBase` + cesta níže,
takže **nejjednodušší je udělat stejné cesty** – pak na frontendu neměním nic.
Jak to dělám teď v Node, je vždycky v `app/api/<cesta>/route.ts`, kdyby ses chtěl podívat.

Seřazené od nejdůležitějšího:

### 3.1 Vyvolávací systém Call250V (Kadlec) – `queue/*`

Call250V má REST API s klíčem (číslo licence) a ten nesmí být v prohlížeči. Most jen přepošle dotaz
na Call250V a přidá klíč. Adresa Call250V a klíč by byly v konfiguraci serveru.

| Metoda | Cesta | Co dělá |
|---|---|---|
| GET | `queue?serviceId=A1,A2` | seznam lístků (víc činností přes čárku, nebo vše) |
| GET | `queue/config` | činnosti a tiskárny |
| POST | `queue/add` | nový lístek (`{ serviceId }`) |
| POST | `queue/next` | vyvolat dalšího |
| POST | `queue/{id}/call` | vyvolat konkrétní lístek k pultu (`{ counter, operatorId }`) |
| PATCH | `queue/{id}` | přeřadit / přiřadit pacienta (`{ serviceId, externalIdentifier }`) |
| POST | `queue/{id}/complete` | ukončit návštěvu |

Přesný tvar dat a hlášky chyb jsou v `lib/call250v/types.ts` a `lib/call250v/server.ts`.

### 3.2 Zaměstnanci a šablony popisu – `staff`, `templates`

To je to, co máš v [VACLAV.md](VACLAV.md) v bodech 4 a 6. Teď to leží jen v souborech na testovacím
serveru, v produkci to musí být v databázi.

| Metoda | Cesta | Co dělá |
|---|---|---|
| GET / POST | `staff` | seznam / nový zaměstnanec |
| PATCH | `staff/{id}` | úprava (role, oprávnění, aktivní) |
| GET / POST | `templates` | šablony popisu / nová |
| PUT / DELETE | `templates/{id}` | úprava / smazání |

Tvar dat: `lib/auth/types.ts` (zaměstnanec) a `lib/templates/types.ts` (šablona). Šablony jsou ve staré
kartotéce v tabulce `study_description_template`, takže by to mohlo číst přímo odtamtud
a obě kartotéky by měly stejné šablony.

Ještě k přihlášení: teď je v nové kartotéce jen výběr zaměstnance (simulace). V produkci potřebuju
`GET /me` – kdo je přihlášený (podle SSO). Detaily jsou v [ROLE-BACKEND.md](ROLE-BACKEND.md).

### 3.3 e-Žádanky – `ezadanka/*`

To už děláš v Javě. Frontend volá `ezadanka/{id}`, `ezadanka/by-rid/{rid}`, `ezadanka/by-kod/{kod}`,
tvar dat je v `lib/ezadanka/types.ts`.

### 3.4 Věci přes internet – SuperSaaS, VZP

Tyhle při výpadku internetu stejně nepůjdou, aplikace pak jen napíše, že se to nepodařilo, a jede dál.

| Metoda | Cesta | Co dělá |
|---|---|---|
| GET | `supersaas/booking?schedule_id=…` | objednávky z kalendáře SuperSaaS (účet a API klíč v konfiguraci serveru). Pustit jen kalendáře ze seznamu v `lib/supersaas/calendars.ts` (ostatní 403) |
| POST | `supersaas/booking` | nová objednávka (JSON: `schedule_id`, `start`, `finish` jako „2026-11-02 09:00“, `full_name`, `mobile`, `email`, `field_1`, `field_1_r`, `field_2_r`) → přepošle do SuperSaaS `POST /api/bookings.json?schedule_id=…`, vrátí `{ id }` nebo jeho chybu (např. „Tento slot už je obsazen“). **Jen kalendáře povolené v konfiguraci serveru** (teď jen Testovací zdroj 856112), ostatní 423 |
| DELETE | `supersaas/booking/{id}?schedule_id=…` | zrušení objednávky (SuperSaaS chce i `schedule_id`, jinak 404); stejné povolení jako zápis |
| POST | `ops/vzp` | ověření pojištění u VZP – potřebuje certifikát, tělo i odpověď se přeposílají beze změny |

### 3.5 Provozní aplikace (spotřební materiál, hromadný tisk, online přístup, připojení lékaři) – `ops/*`

Tohle teď volá tu druhou aplikaci (Node, běží centrálně). **Nevím, jestli na ni lokální servery
poboček vůbec dosáhnou** – to musíme zjistit. Most propouští jen tyhle cesty, nic jiného:

| Metoda | Cesta |
|---|---|
| GET | `ops/tisk-studies`, `ops/tisk-pdf`, `ops/study-pdf/{id}`, `ops/check-study`, `ops/medical_institution` |
| POST | `ops/extend-validity` (prodloužení online přístupu – zapisuje) |
| GET | `ops/spotreba/branches`, `items`, `summary`, `periods`, `admin-check` |

**Pozor na spotřební materiál:** zápisy (`ops/spotreba/order…`, `ops/spotreba/items` mimo GET) mám
zatím zablokované, i `GET ops/spotreba/order`, protože ten v té aplikaci objednávku rovnou založí.
Ať to tak zůstane, dokud to neodsouhlasím. Seznam je v `app/api/ops/[...path]/route.ts` (ALLOW).

### 3.6 Stav systému – `status` (nepovinné)

GET `status` → jestli odpovídá backend, vyvolávací systém a objednávky (Nastavení → Stav systému).
Když to nebude, ukáže se tam jen „nedostupné“.

## 4. Jak jsem to vyzkoušel

Statické sestavení jsem pustil za malým testovacím serverem, který dělal „Payaru“: podával jen soubory
z `out/` pod `/CFLocalSyncWeb/m` a dotazy na `/CardFileWebWS/rest/…` posílal dál (na zkušební data).
Prošlo přihlášení, vyhledání pacienta, karta pacienta i studie (i po F5 a přímou adresou), plocha
lékaře, psaní popisu a „Další na řadě“, kalendář, tisk, spotřební materiál, nastavení. Nic se nestahovalo
z internetu.

## 5. Co potřebuju vědět od tebe

1. Pod jakou adresou to v Payaře má být (`/CFLocalSyncWeb/m`?).
2. Jak se ti líbí cesty mostů (bod 3) – stejné jako mám já, nebo jinak?
3. Jestli chceš sestavení frontendu v Mavenu, nebo ti budu posílat hotovou složku.
4. Jestli lokální servery poboček vidí na provozní aplikaci (bod 3.5).
5. Nastavení pobočky – stačí `config.js`, nebo radši z tvého API?

Michal
