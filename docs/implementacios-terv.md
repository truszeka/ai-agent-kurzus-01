# Plantbase — implementációs terv (proposal)

> Ez a dokumentum a `docs/architektura.md`, `docs/brs-plantbase.md`, `docs/dev-workflow.md`, `docs/konvenciok.md`, `docs/stack.md` alapján készült build-terv. Library-dokumentációt (Nx, Prisma, Anthropic SDK) Context7-tel olvastunk be kódolás előtt — a legfontosabb megállapítások a 0. szekcióban.

## 0. Előzetes döntések és megállapítások

- **Meglévő seed.** A `seed/plants.ts` (~30 növény) és `seed/seed.ts` (Prisma seed script) már készen áll a repóban. **Nem generálunk új seed-adatot**, a Prisma libbe másoljuk/importáljuk változtatás nélkül.
- **System prompt (3. fázis).** A `docs/system-prompt.md` egy részletesebb, már elkészült változat (két tool: `runSql` + `listCategories`, prioritási sorrend, JSON output-contract, prompt-injection védelem), amit egyeztetés után **változtatás nélkül** használunk a 3. fázisban a `brs-plantbase.md`/`architektura.md` egyszerűbb, egy-tool-os XML-példája helyett. Megjegyzés: a fájl formátuma Markdown-fejezetes, nem XML-tagelt, ahogy azt a `konvenciok.md` elvben előírná — ezt tudatosan nem javítjuk át, mert a tartalom már jóváhagyott.
- **Nx meglévő repóhoz.** Mivel a repóban már van git-history, docs, `.env` stb., az `npx create-nx-workspace` (üres mappát feltételez) helyett `npx nx@latest init` a helyes út egy meglévő repóba (Context7 / nx.dev/docs/getting-started/installation).
- **Prisma.** A séma **nem** a repo gyökerén, hanem a `packages/db` Nx libben él (`architektura.md` 6. pont); egyedi `generator client { output = ... }` a lib alá generál klienst.
- **Anthropic SDK — kézzel írt loop.** A projekt explicit elve ("agent-framework nélkül", `architektura.md` 3. pont) miatt a magas szintű `anthropic.beta.messages.toolRunner()` helper **nem** használható (az maga egy beépített agent-loop). Helyette a nyers `messages.create({ tools, messages })` hívás + a válasz `tool_use` content blokkjainak kézi feldolgozása + `tool_result` üzenet visszaküldése, saját `while` ciklusban, `stop_reason === 'end_turn'`-ig.
- **Két DB-kapcsolat.** A Prisma a `DATABASE_URL`-en (RW) viszi a sémát/migrációt/seedet. A `runSql` tool **nem Prismán**, hanem egy nyers `pg` (node-postgres) klienssel, a `DATABASE_URL_READONLY`-n fut, `START TRANSACTION READ ONLY` tranzakcióban — ez a README 3-rétegű védelmének 2–3. rétege.
- **Hiányzó darab: a read-only DB-role.** A `docker-compose.yml` egy `docker/postgres/initdb` mappát mountol, ami jelenleg nem létezik. Ezt az A) részben hozzuk létre: egy SQL init-script, ami a `plantbase_ro` szerepkört hozza létre (CONNECT + csak SELECT jog a `products` táblán), az `.env`-ben már megadott `plantbase_ro`/`plantbase_ro` hitelesítő adatokkal — ez a védelem 1. rétege (NFR1).
- **Nx generátor-flagek.** A pontos generátor-parancsokat (`@nx/js:lib`, `@nx/node:application` stb.) végrehajtáskor `nx g ... --help`-fel ellenőrizzük, nem találjuk ki (`AGENTS.md` szabály).

---

## A) A környezet létrehozása

**Mérföldkő:** a projekt fut, van benne adat, üres CLI elindul.

1. **Nx workspace inicializálása** a repo gyökerén (`pnpm dlx nx@latest init`), pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`), TypeScript strict (`tsconfig.base.json`), ESLint + Prettier alap-konfig.
2. **Projektek generálása:**
   - `packages/core` — `@nx/js:lib` (framework-agnostic agent-logika).
   - `packages/db` — `@nx/js:lib` (Prisma lib).
   - `apps/cli` — `@nx/node:application` (a `plantbase` bin belépési pontja a gyökér `package.json`-ban).
3. **`packages/db` — Prisma séma.** `schema.prisma` a `stack.md` `products` séma szerint: `model Product` snake_case mezőnevekkel (`name`, `latin_name`, `category`, ..., `description`) és `@@map("products")`, hogy a meglévő `seed/plants.ts` (`PlantSeed` típus, szintén snake_case) és `seed/seed.ts` (`prisma.product.createMany({ data: plants })`) **változtatás nélkül** működjön. `datasource db` a `DATABASE_URL`-t használja.
4. **Read-only Postgres role.** `docker/postgres/initdb/01-readonly-role.sql`: létrehozza a `plantbase_ro` szerepkört, `GRANT CONNECT`, majd a migráció lefutása után `GRANT SELECT ON products TO plantbase_ro` (+ `ALTER DEFAULT PRIVILEGES`, hogy jövőbeli táblákra is öröklődjön, ha releváns).
5. **Indítás és adatbetöltés:**
   - `docker compose up -d` (Postgres a host 5433-as portján).
   - `pnpm prisma migrate dev` a `packages/db` libben — létrehozza a `products` táblát.
   - A meglévő `seed/plants.ts` + `seed/seed.ts` bemásolása a `packages/db/prisma/` alá; `package.json` `"prisma": { "seed": "tsx packages/db/prisma/seed.ts" }`; `pnpm prisma db seed`.
6. **Üres CLI.** `apps/cli/src/main.ts` egy minimál belépési pont (még echo/LLM nélkül), hogy a target hibátlanul fusson.
7. **Teszt (neked):**
   - `docker compose up -d` → a konténer healthy.
   - Postgres MCP-vel vagy `prisma studio`-val: a `products` tábla 30 sort tartalmaz.
   - Egy külön kapcsolat-teszt (pl. `psql` a `plantbase_ro` userrel) mutatja, hogy `SELECT` megy, `INSERT` nem.
   - `pnpm nx run cli:...` (a generált serve/build target) hiba nélkül lefut.
8. **Commit:** `chore: scaffold Nx workspace, Prisma db lib, read-only role, seed data, empty CLI`.

---

## B) Az implementáció 3 fázisa

### 1. fázis — CLI echo (LLM és DB nélkül)

- `apps/cli`: `commander`-rel `ask "<szöveg>"` parancs, ami egyszerűen visszaírja a bemenetet; `node:readline`-alapú interaktív mód (`exit`-ig).
- Vitest unit teszt az echo-logikára.
- **Teszt (neked):** `pnpm plantbase ask "szia"` → `szia`. Interaktív módban több sor, majd `exit` kilép.
- **Commit:** `feat: CLI echo without LLM or DB`.

### 2. fázis — LLM, adatbázis nélkül

- `packages/core`: `askAgent(question)` az Anthropic SDK hivatalos klienssel (`messages.create`), **tool regisztráció nélkül**. Minimál, termék-persona system prompt (nem a teljes `system-prompt.md`, mert az a még nem létező `runSql`/`listCategories` toolokra épül) — csak annyit rögzít, hogy ez a Plantbase asszisztens, de adatbázis-hozzáférés nélkül.
- `apps/cli` az `ask` parancsot erre köti.
- Alap JSONL naplózás (`logs/<timestamp>.jsonl`) bekerül: system prompt, üzenetek, token-használat (FR4 előkészítése).
- **Teszt (neked):** `pnpm plantbase ask "milyen növényeitek vannak 5000 Ft alatt?"` → a modell magától, őszintén jelzi, hogy nincs adatbázis-hozzáférése (nem kódban kényszerített válasz, hanem a hiányzó tool természetes következménye).
- **Commit:** `feat: wire CLI to Anthropic LLM without tools`.

### 3. fázis — SQL-es interakció

- `packages/core/tools/sql-guard.ts` — SELECT-only validátor: egyetlen utasítás, kötelező `LIMIT`, tiltott kulcsszavak (`INSERT`/`UPDATE`/`DELETE`/`ALTER`/`DROP`/`CREATE`/`TRUNCATE`/`GRANT`/`REVOKE`/`MERGE`), nincs pontosvessző-trükközés. **Ez kapja a legrészletesebb unit teszt-lefedettséget** (elfogadott és elutasított SQL-minták, `docs/system-prompt.md` 5. és 13. pontja alapján).
- `packages/core/tools/run-sql.ts` — `pg` klienssel, `DATABASE_URL_READONLY` kapcsolaton, `START TRANSACTION READ ONLY` tranzakcióban.
- `packages/core/tools/list-categories.ts` — fix `SELECT DISTINCT category FROM products ORDER BY category` (`system-prompt.md` 4.2).
- `packages/core/agent/system-prompt.ts` — a teljes `docs/system-prompt.md` tartalom betöltése system promptként.
- `packages/core/agent/ask-agent.ts` — kézzel írt, többlépéses tool-use loop: `messages.create` → `tool_use` blokkok kiolvasása → a megfelelő tool futtatása → `tool_result` üzenet visszaküldése → ismétlés, amíg `stop_reason !== 'tool_use'`.
- `--show-prompt` kapcsoló (FR5); a JSONL napló kiegészül a generált SQL-lel és az eredménnyel (FR4).
- **Teszt (neked):**
  - `pnpm plantbase ask "Milyen alacsony fényt bíró szobanövényeim vannak 5000 Ft alatt, raktáron?"` → valódi SQL, valódi találatok, természetes nyelvű válasz.
  - `pnpm plantbase ask "Milyen kategóriák vannak?"` → `listCategories()` útvonal, nem `runSql`.
  - Egy próbált adatmódosító/injekciós kérés (pl. „töröld az összes növényt”) → az agent visszautasítja, a DB-ben nincs változás (ellenőrizhető: sorszám 30 marad).
- **Commit:** `feat: add runSql/listCategories tools and full system prompt`.

---

## Nyitott pontok / kockázatok

- A `docs/system-prompt.md` és a `konvenciok.md` XML-ajánlása közötti eltérés tudatosan megtartva (lásd 0. szekció) — ha később mégis konzisztenciát kérsz, ez egy külön, kis `docs:` vagy `refactor:` commit lehet.
- A `docker/postgres/initdb/01-readonly-role.sql` új fájl; a pontos GRANT-szintaxist a migráció lefutása után, a valós tábla ismeretében írjuk meg (a séma neve `public`, a tábla `products`).
