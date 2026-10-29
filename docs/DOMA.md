# Kartotéka doma (demo režim)

Na domácím PC poběží celá kartotéka přímo v prohlížeči – animace plynule, bez TeamVieweru.
Místo skutečného backendu odpovídá **demo režim** se smyšlenými pacienty a studiemi
(žádná skutečná data neopustí firmu). Funguje: přihlášení výběrem zaměstnance, plocha,
vyvolávací systém (simulace, tlačítka „Vytisknout lístek“), pacienti, studie, popisy, PDF,
objednávky, správa zaměstnanců. Úpravy se ukládají do paměti a po restartu zmizí.

## Jednou: instalace (asi 10 minut)

1. **Node.js 22 LTS** – https://nodejs.org → tlačítko „LTS“ → nainstalovat (vše výchozí).
2. **Git** – https://git-scm.com/download/win → nainstalovat (vše výchozí).
3. Otevřít **Příkazový řádek** (Start → napsat `cmd` → Enter) a zadat:

   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/michalctvrt/kartoteka.git
   cd kartoteka
   git checkout call250v
   npm install
   echo DEMO_MODE=1 > .env.local
   type .env.local
   ```

   Při `git clone` se otevře okno přihlášení ke GitHubu → přihlásit se jako `michalctvrt`
   (jde to i bez tokenu, přes prohlížeč).
   Poslední příkaz musí vypsat `DEMO_MODE=1`. Mezera před `>` je důležitá – bez ní si příkazový
   řádek vezme `1>` jako přesměrování a jednička se do souboru nezapíše.

## Pokaždé: spuštění

```
cd %USERPROFILE%\Documents\kartoteka
npm run dev
```

Pak v prohlížeči otevřít **http://localhost:4001** a vybrat zaměstnance (např. Recepce Olomoucká).
Vypnout: v příkazovém řádku **Ctrl + C**.

### Ukázkoví pacienti

Všichni jsou smyšlení (`lib/demo/data.ts`).

| Pacient | Rodné číslo | Vyšetření |
|---|---|---|
| Jan Novák | 680314/1000 | 1 |
| Marie Svobodová | 756102/1037 | 2 |
| Petr Dvořák | 820621/1074 | 3 |
| Eva Černá | 905109/1111 | 4 |
| Tomáš Procházka | 570930/1148 | 1 |
| Lucie Kučerová | 885417/1185 | 2 |
| Martin Veselý | 791205/1222 | 3 |
| Jana Horáková | 645723/1259 | 4 |
| Pavel Němec | 010211/1296 | 1 |
| Kateřina Marková | 955828/1333 | 2 |
| Josef Pokorný | 490516/1370 | 3 |
| Tereza Pospíšilová | 126003/1407 | 4 |

- Rodné číslo jde zadat s lomítkem i bez (`6803141000`), jméno i bez diakritiky („novak“, „kuc“).
- Studie mají čísla **3300000001–3300000030** (3300000001 je nejnovější); ve „Vyhledat studii“
  stačí nic nezadávat a ukážou se všechny.
- Nové rodné číslo jde zkusit taky – pacient se založí a vydrží do restartu `npm run dev`.

### Plynulejší animace (jako v provozu)

Vývojový režim (`npm run dev`) je při prvním otevření stránky pomalejší. Na posouzení animací:

```
npm run build
npm start
```

a otevřít http://localhost:4001. (Po každé změně kódu znovu `npm run build`.)

## Aktualizace na nejnovější verzi

```
cd %USERPROFILE%\Documents\kartoteka
git pull
npm install
npm run dev
```

## Když něco nejde

| Problém | Řešení |
|---|---|
| `'node' is not recognized` | Node.js není nainstalovaný, nebo zavřít a znovu otevřít příkazový řádek |
| `'git' is not recognized` | Git není nainstalovaný (krok 2), znovu otevřít příkazový řádek |
| Stránka hlásí „Demo režim není zapnutý“ (nebo „Backend (500)“) | hláška říká, co server vidí. V souboru `.env.local` musí být `DEMO_MODE=1`; opravit příkazem `echo DEMO_MODE=1 > .env.local`, ověřit `type .env.local`, pak Ctrl + C a znovu `npm run dev` |
| `type .env.local` napíše „nelze nalézt“ | soubor chybí nebo se jmenuje `.env.local.txt` (Poznámkový blok) – vytvořit znovu příkazem výše |
| `Port 4001 is in use` | kartotéka už běží v jiném okně; zavřít ho, nebo otevřít rovnou http://localhost:4001 |
| Chci začít s čistými daty | restartovat `npm run dev`; zaměstnance resetuje smazání složky `.data` |

Na Macu: Node.js a Git stejně, v Terminálu místo `%USERPROFILE%\Documents` použít `~/Documents`
a `.env.local` vytvořit příkazem `echo "DEMO_MODE=1" > .env.local`.
