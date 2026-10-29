# Vyvolávací systém Call250V (Kadlec) – pobočka Olomoucká

## Jak to funguje

| Kde | Co dělá | Volání Call250V |
|---|---|---|
| Kiosk u vstupu | pacient zvolí RTG/UZ/MRI, vytiskne se lístek s QR | (kiosk sám) |
| Recepce – Domů | „Vyvolat dalšího“, zadat RČ → otevře/založí kartu | `call` |
| Karta pacienta | „Čekárna RTG/UZ/MRI“ → lístek se propojí s RČ a přeřadí | `PATCH serviceId + externalIdentifier` |
| Laborant / Lékař – Domů i Worklist | tři sloupce RTG / UZ / MRI: vyvolat k dveřím 1/2, po vyšetření „Hotovo →“ na další modalitu nebo recepci; lišta nahoře ukazuje počty čekajících všude | `call`, `PATCH serviceId` |
| Recepce – Domů | výdej zprávy → „Zpráva předána – ukončit lístek“ | `complete` |

Lístek se ukončuje JEN na konci návštěvy, jinak by pacientovi přestal fungovat QR kód na dveřích.

## Soubory

- `lib/call250v/config.ts` – **ID činností (A1…) a pultů (P1…) – po instalaci přepsat podle Kadlece**
- `lib/call250v/server.ts` – volání Call250V (jen ze serveru, Api-Key nesmí do prohlížeče)
- `lib/call250v/mock.ts` – simulátor, běží, když není vyplněné `CALL250V_BASE_URL`
- `app/api/queue/*` – API routes, které volá frontend
- `components/queue/*` – panel recepce, box na kartě pacienta, přehled čekáren (WaitingBoard), lišta s počty (QueueStatusBar)

Upravené stránky: `reception/page.tsx` (panel), `reception/patients/[pid]/page.tsx` (box nad Identifikací),
`lab/page.tsx` a `doctor/worklist/page.tsx` (worklist).

## Spuštění

Do `.env.local` (vzor je v `.env.local.example`):

```
CALL250V_BASE_URL=http://<adresa>:<port>
CALL250V_API_KEY=<číslo licence>
CALL250V_DEFAULT_OPERATOR_ID=<ID operátora>
```

Bez `CALL250V_BASE_URL` běží simulace: na recepci jsou tlačítka „Vytisknout lístek“ místo kiosku.

Pult recepce, modalita a ID operátora se nastavují na každém počítači zvlášť (ukládá se v prohlížeči).

## Předpoklady, které je potřeba ověřit u Kadlece

1. Vrátí se pacient po `PATCH serviceId` do stavu „čeká“ a uvolní se tím pult? Řadí se v nové frontě podle času tisku lístku?
2. Blokuje vyvolaný pacient pult (409 „counter busy“), dokud ho nepřeřadím nebo neukončím?
3. Řídí zámky dveří a QR Call250V podle `serviceId` + `counter`? Co je v QR kódu?
4. Seznam pultů (counter ID) a operátorů.
5. Do `externalIdentifier` ukládáme RČ. Je to v pořádku z pohledu GDPR, nebo použít jiné ID?
6. Bude Call250V dostupný ze serveru, kde poběží kartotéka?
