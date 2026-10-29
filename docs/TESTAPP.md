# Převod funkcí z `/opt/testapp` do Kartotéky 2.0

`/opt/testapp` je **ostrý provoz** (interní stránka pro zaměstnance) – **nic tam neměnit, nespouštět, nezapisovat.**
Kartotéka jeho funkce přebírá postupně: UI je naše (bento), data bere **přes stávající backend testappu**
(jedno místo pravdy, obě aplikace můžou běžet vedle sebe). Brána: `app/api/ops/[...path]` → `TESTAPP_API_URL`
(jen v `.env.local`), povolené jen vyjmenované cesty. Adresy služeb ani přístupové údaje do gitu nepatří.

## Co testapp běží
- backend (Express) – čte přímo databáze kartotéky (centrální + pobočkové kvůli PDF zpráv) a SQLite se spotřebním materiálem
- frontend (Next.js) – interní stránka pro zaměstnance
- ověření pojištění: samostatná služba registru pojištěnců (`VZP_API_URL`; když běží na stejném serveru,
  `VZP_CONNECT_HOST=127.0.0.1`; server služby neposílá mezilehlý certifikát → `certs/certum-ov-tls-g2-r39.pem`)

## Funkce a stav převodu

| Testapp | Co dělá | API testappu | V Kartotéce |
|---|---|---|---|
| Hromadný tisk | dokončené studie za den pro lékaře (IČP) pobočky, sloučené PDF s „jméno lékaře \| IČP“ v rohu | `GET /tisk-studies?workplace=BRDO\|BRLE&date=`, `GET /tisk-pdf?ids=`, `GET /study-pdf/:id` | **hotovo** – `/reception/print` (výchozí den = předchozí pracovní den bez svátků) |
| Pacient – pojištění | stav pojištění k datu + pojišťovna | VZP služba `POST {cisloPojistence, datum}` → `{stav: pojisten\|nepojisten, kodPojistovny, nazevPojistovny}` | **hotovo** – dlaždice Pojišťovna na kartě pacienta (ověří k dnešku, jiný den, upozornění na rozdíl s kartou + „Přepsat“) |
| Pacient – online přístup | platnost odkazu na zprávu, prodloužení o 3 dny (ZÁPIS do DB) | `GET /check-study?uid=`, `POST /extend-validity {uid, days}` | **hotovo** – dlaždice „Online přístup ke zprávě“ na kartě studie (platnost z REST, prodloužení přes testapp) |
| Připojení lékaři | lékaři s CGM / E-zpráva / LIVEcom, filtr, export PDF | `GET /medical_institution?limit=10000` | **hotovo** – `/reception/doctors` (lékař jednou se štítky systémů, dlaždice = filtr, CSV, tisk/PDF) |
| Spotřební materiál | měsíční objednávky poboček (Makro / Sklad Vídeňská / Objednat online), katalog (PIN), souhrn + tisk + CSV | `/spotreba/*` (viz níže) | **hotovo** – `/supplies` (objednávka), `/supplies/summary`, `/supplies/catalog`; na ostrých datech **jen čtení**, zápis až s `SPOTREBA_WRITE=1` |
| E-žádanka | rozpracovaný formulář bez uložení | `CFPublicWebWS e-zprava/vyhledat` | nepřebírá se – Kartotéka má vlastní e-žádanky |

Pracoviště pro tisk a IČP lékařů jsou natvrdo v `server.js` (`TISK_CONFIG`: BRDO „Dobrák“ 11 IČP, BRLE „Lesná“ 20 IČP).

## Spotřební materiál (spec z kódu)
- Tabulky: branches (code, name, is_warehouse, color, color_light), items (category MAKRO|SKLAD|OBJEDNAT,
  item_group PAPIRNICTVI|DROGERIE|POTRAVINY|OSTATNI, name, unit, pack_note, pack_size, piece_unit, active, sort_order),
  orders (branch_id, period YYYY-MM, status open|locked, locked_by/at; unikátní pobočka+měsíc),
  order_items (item_id nebo custom_name, category, qty, unit_mode pack|piece, note).
- Pobočky: BRDO Dobrovského, BRLE Lesná, BRVI Vídeňská (= sklad → u ní se krok SKLAD skrývá).
- API: `GET /branches`, `GET /items[?all=1]`, `POST|PUT|DELETE /items` (admin PIN v hlavičce `x-admin-pin`),
  `GET /order?branchId&period` (založí prázdnou objednávku!), `PUT /order/:id {lines, note}` (přepíše všechny řádky;
  409 když uzavřená), `POST /order/:id/lock {lockedBy}`, `POST /order/:id/unlock` (admin), `GET /summary?period`, `GET /periods`.
  Všechny POST/PUT musí mít `Content-Type: application/json` (jinak 415).
- Souhrn: řádky sečtené na kusy (pack × pack_size), po pobočkách; MAKRO a OBJEDNAT jako matice, SKLAD po pobočkách;
  tisk a CSV (středník, BOM). Pozor na známou chybu originálu: skrytá položka katalogu zmizí z objednávky při dalším uložení.

### Ochrana ostrých dat spotřeby v Kartotéce
- Brána pouští na ostrý backend jen čtení: `branches`, `items`, `summary`, `periods`, `admin-check`.
- `GET /order` (založí objednávku!), `PUT/POST /order…`, `POST/PUT/DELETE /items` → **423**, dokud v `.env.local`
  není `SPOTREBA_WRITE=1`. Obrazovka objednávky pak ukáže, že se objednávky dělají v původní aplikaci.
- Vývoj a testy jen v demo režimu (`lib/demo/spotreba.ts`, PIN v demu 1234).
- Oprava proti originálu: řádky s položkou skrytou z katalogu se při uložení objednávky neztratí.

