# Role a zaměstnanci – zadání pro backend (CardFileWebWS)

Stav k 2026-10-29. Frontend má role a oprávnění hotové, ale **přihlášení a seznam zaměstnanců
zatím jen simuluje** (`app/api/staff`, soubor `.data/staff.json`, výběr uživatele v `/login`).

> **Důležité:** frontend jen schovává tlačítka a stránky. Skutečná ochrana musí být na backendu:
> každý endpoint musí podle přihlášeného uživatele odmítnout, co jeho role nesmí (403).

## Role

| Role (frontend) | Dnešní role v backendu | Smí |
|---|---|---|
| `admin` | `admin` | vše + správa zaměstnanců a rolí |
| `reception` | `administrativa` | fronta recepce (vyvolat, přiřadit lístek, rozřadit), pacienti (založit, upravit), vyšetření (založit, upravit) |
| `lab` | — **chybí, přidat `laborant`** | worklist, vyvolání do ordinace a „Hotovo →“; pacienty a studie jen čte |
| `doctor` | `doctor` | worklist, studie + **popis**, vyvolání pacienta; pacienty jen čte |

Uživatel může mít víc rolí, oprávnění se sčítají. Mapování je v `lib/auth/roles.ts` (`BACKEND_ROLE`).

**Role jsou jen předvolby.** Admin může u každého zaměstnance jednotlivá oprávnění přidat nebo odebrat
(včetně oken na ploše, např. lékař bez okna „Nový pacient“). Ukládají se jen odchylky (`grants` / `denies`);
skutečná oprávnění = oprávnění rolí + grants − denies. Seznam oprávnění a jejich výchozích rolí je
v `lib/auth/roles.ts` (`CAPABILITIES`) – backend by měl kontrolovat podle stejných id.

### Oprávnění podle endpointů (návrh)

| Endpoint | admin | reception | lab | doctor |
|---|:-:|:-:|:-:|:-:|
| `GET /patient/*`, `POST /patient/:search` | ✓ | ✓ | ✓ | ✓ |
| `POST /patient/{pid}` (založit/upravit) | ✓ | ✓ | – | – |
| `GET /study/*`, `POST /study/:search`, PDF | ✓ | ✓ | ✓ | ✓ |
| `POST /study`, `PUT /study/{id}` (základní údaje) | ✓ | ✓ | – | – |
| úprava popisu (`description`) – zatím není v API | ✓ | – | – | ✓ |
| `:emailStudy`, `:createRemoteAccess`, `:cancelRemoteAccess` | ✓ | ✓ | – | ✓ |
| `:createWorklist` | ✓ | ✓ | ✓ | – |
| zaměstnanci (níže) | ✓ | – | – | – |

Pozn.: Vyvolávací systém (Call250V) volá náš server (`app/api/queue`), ne CardFileWebWS. Až bude `/me`,
ohlídáme `queue.reception` / `queue.call` i tam.

## Potřebné endpointy

```
GET    /me                → Employee            přihlášený uživatel (podle SSO cookie JSESSIONIDSSO)
GET    /staff             → Employee[]          jen admin
POST   /staff             ← EmployeeInput → Employee
PATCH  /staff/{id}        ← Partial<EmployeeInput> → Employee
```

Heslo frontend neposílá ani neukládá. Nastavení / reset hesla ať řeší přihlašování na Payaře
(nebo `POST /staff/{id}/:resetPassword`, které pošle odkaz e-mailem – na domluvě).

### Employee

```ts
{
  id: string
  login: string            // 2–32 znaků: a-z 0-9 . _ -  (unikátní)
  firstName: string
  lastName: string
  title?: string | null    // MUDr. …
  email?: string | null
  roles: ("admin" | "reception" | "lab" | "doctor")[]   // nebo backendové názvy, mapujeme
  grants?: string[]        // oprávnění NAVÍC proti rolím (id z lib/auth/roles.ts → CAPABILITIES)
  denies?: string[]        // oprávnění ODEBRANÁ proti rolím
  active: boolean          // false = nesmí se přihlásit
  workingplace?: string | null   // kód z /workingplace (pobočka), nepovinné
  createdAt: string        // ISO
  updatedAt: string
}
EmployeeInput = Employee bez id/createdAt/updatedAt
```

### Pravidla, která frontend už hlídá (backend by měl také)

- unikátní `login`, platný e-mail,
- aspoň jedna role,
- **musí zůstat aspoň jeden aktivní zaměstnanec se `staff.manage`** (chyba 400 s textem),
- neznámé id oprávnění v `grants`/`denies` odmítnout,
- chyby vracet jako `{ "error": "text pro uživatele" }` – frontend ho rovnou zobrazí.

## Otázky

1. Kde dnes žijí role `admin` / `doctor` / `administrativa` – v realmu Payary (skupiny), nebo v tabulce?
2. Půjde `GET /me` přes stejnou SSO cookie jako zbytek API?
3. Laboranti: přidáte skupinu `laborant`, nebo mají zůstat pod jinou rolí?
4. Má mít zaměstnanec pobočku (omezit, co vidí), nebo vidí všechny pobočky?
