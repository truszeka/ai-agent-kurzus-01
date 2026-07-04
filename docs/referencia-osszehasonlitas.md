# Összehasonlítás a referencia megvalósítással

Ez a dokumentum a jelen projekt (`ai-agent-kurzus-01`) és a hozzá tartozó
referencia/base megvalósítás (`ai-agent-kurzus-base`) közötti eltéréseket
gyűjti össze. Kizárólag megfigyeléseket tartalmaz — nem ír elő és nem indokol
implementációt.

## 1. Azonos alapdokumentáció

A következő fájlok **bájt szinten megegyeznek** a két repóban, tehát ezek adják
a közös kurzus-alapot:

- `docs/architektura.md`
- `docs/brs-plantbase.md`
- `docs/dev-workflow.md`
- `docs/konvenciok.md`
- `docs/stack.md`
- `docs/setup-instructions.md`
- `CLAUDE.md`, `AGENTS.md`
- `docker-compose.yml`

## 2. Eltérő terv és system prompt

- A base repo `docs/system-prompt.md`-je 53 sor, rövid XML-tagelt prompt,
  egyetlen tool-lal (`runSql`). A jelen projekté 586 sor, jóval részletesebb
  (17 szekció, JSON output-contract, `listCategories` tool is).
- A base repo terve (`docs/proposal-implementacio.md`) is csak `runSql`-t
  említ a 3. fázisban — a jelen projekt `docs/implementacios-terv.md`-je
  explicit dokumentálja a `listCategories`-t is.
- A két projekt emiatt más specifikációt valósít meg, nem egyszerű
  elmaradásról van szó.

## 3. Base repo dokumentálatlan kiegészítése: `getClientPreferences`

A base repo tartalmaz egy `getClientPreferences` tool-t, amely ügyfélkód
(`ACME`/`GLOBEX`/`INITECH`) alapján ad vissza fix büdzsét és
gondozási-igényességi preferenciát. Ez a base repo saját dokumentációjában
(`system-prompt.md`, `proposal-implementacio.md`) sehol nincs megemlítve —
tisztán kód-szintű, dokumentálatlan kiegészítés.

## 4. `sql-guard` viselkedésbeli különbségek

| Szempont | Base repo | Jelen projekt |
|---|---|---|
| Komment (`--`, `/* */`) | kivágja, majd tovább fut | elutasítja a lekérdezést |
| Hiányzó `LIMIT` | automatikusan hozzáfűzi (`LIMIT 50`) | elutasítja |
| `LIMIT` felső korlát | nincs kikényszerítve | 50 fölött elutasítja |
| `WITH ... SELECT` (CTE) | engedélyezett | nincs kezelve (csak `SELECT`-tel induló) |
| `JOIN` | engedélyezett | tiltott |
| csak `products` tábla | nincs külön ellenőrzés | expliciten kikényszerítve |
| tiltott kulcsszavak | ...`copy` is | ...`merge` is (a `copy` nincs bent) |

## 5. Agent / core architektúra különbségek

- **Beszélgetés-memória**: a base repo interaktív módban átviszi az előző
  körök üzeneteit (`history`/`messages`) — a jelen projektben minden kérdés
  teljesen új, előzmény nélküli beszélgetés.
- **Config-validáció**: base repo külön `config.ts`-ben Zod-dal, fail-fast,
  induláskor egyszer — a jelen projektben nincs dedikált config modul, az
  env-eket ad-hoc olvassuk.
- **DB-pool**: base repo egy singleton, modul-szintű pool-t tart életben
  (`statement_timeout`, `application_name`, `max: 4`), explicit
  `closeReadOnlyPool()`-lal zárva a CLI végén — a jelen projektben minden
  `askAgent()`-hívás új Pool-t nyit/zár.
- **Megfigyelhetőség**: base repo egy ~340 soros `trace.ts`-t tartalmaz: élő,
  színes konzol-kimenet minden LLM-hívás előtt/után, JSON trace fájl
  (`logs/<ts>.json`) és egy folyamatos, `tail -f`-elhető `logs/agent.log` — a
  jelen projektben egyszerű, egy JSONL fájl kérdésenként.
- **`runSql` eredmény**: base repo `{columns, rowCount, rows, truncated}`-ot ad
  vissza 100 soros vágással — a jelen projektben csak nyers `{rows}`, vágás
  nélkül.

## 6. CLI UX különbségek

- Base repo: `plantbase ask` mindig kötelező alparancs; argumentum nélküli
  `plantbase` súgót ír ki és kilép — a jelen projektben a szimpla `plantbase`
  egyből interaktív módba lép.
- Base repo interaktív módja: látható `> ` prompt + üdvözlő szöveg, kilépő
  szavak: `exit`/`quit`/`kilép` — a jelen projektben nincs látható
  prompt/instrukció, csak `exit` léptet ki.
- Base repo: `--quiet` kapcsoló (nincs élő trace, csak a végső válasz) — a
  jelen projektben `--show-prompt` (a system promptot írja ki).
- Base repo a `pnpm cli` scripttel `tsx --conditions=@plantbase/source`-t
  használ a CLI közvetlen futtatásához (natív package.json feltételes
  `"exports"` — `"@plantbase/source"` → `./src/index.ts` dev módban,
  `./dist/index.js` produkcióban). A jelen projekt ugyanezt a
  resolution-problémát a `packages/core/dist` külön mappába helyezésével
  oldotta meg.

## 7. Nx workspace / build-tooling generáció

- Base repo az újabb "Nx TS solution" stílust használja: `@nx/js/typescript` +
  `@nx/vite/plugin` plugin-inferencia (nincs kézzel írt `project.json`, a
  targetek a package.json `"nx"` kulcsa alatt élnek), `namedInputs`,
  `sync.applyChanges`, `typecheck` és `e2e` target is konfigurálva. A jelen
  projekt a hagyományosabb, explicit `project.json`-os felépítést használja,
  nincs `typecheck`/`e2e` target.
- Az `apps/cli`-nek a base repóban saját `package.json`-ja van (benne
  `commander`, `dotenv`, `@plantbase/core: workspace:*`) — a jelen projektben
  az `apps/cli`-nek nincs saját package.json-ja, a root `package.json`
  tartalmazza ezeket a függőségeket.
- Base repo `apps/cli` build kimenete `apps/cli/dist` (helyi) `format: cjs`-sel
  — a jelen projektben `dist/apps/cli` (megosztott, top-level) `format:
  esm`-mel.
- Base repo `dotenv` csomagot használ az `.env` betöltéséhez — a jelen
  projekt natív `process.loadEnvFile()`-t.

## 8. Adatbázis-séma eltérések

- Base repo Prisma-modellje camelCase mezőnevekkel + `@map` snake_case
  oszlopokra, `provider: "prisma-client-js"`. A jelen projektben a mezőnevek
  egyenesen snake_case-ek (nincs `@map`), `provider: "prisma-client"`,
  `runtime: "nodejs"`.
- Ár pontosság: base repo `Decimal(12,2)` (2 tizedesjegy) — a jelen projekt
  `Decimal(10,0)` (nincs tizedesjegy, Forinthoz illőbb).
- Rating pontosság: base repo `Decimal(3,2)` — a jelen projekt `Decimal(2,1)`.
- Read-only role SQL: funkcionálisan egyenértékű, de a jelen projekt
  tartalmaz egy extra `DO $$ ... EXECUTE` blokkot, ami újraindítás után a már
  létező táblákra is visszaadja a jogot; ez a base repóban nincs.

## 9. Hiányzó infrastruktúra a jelen projektben

- Nincs `.github/workflows/ci.yml` — a base repo tartalmaz egy Nx
  Cloud-alapú CI workflow-t (`lint test build typecheck e2e`).
- Nincs `.env.example` — a base repo ad egy tiszta sablont; itt csak a
  (gitignore-olt) valós `.env` van, sablon nélkül.
- `.mcp.json`: base repo közvetlenül `@modelcontextprotocol/server-postgres`-t
  köt be a read-only kapcsolatra; a jelen projekt `prisma mcp`-t használ.
- Base repo `.vscode/launch.json`-ja `apps/cli/dist`-re mutat (mert ott van a
  build kimenet), összhangban a 7. pontban leírt eltéréssel.
