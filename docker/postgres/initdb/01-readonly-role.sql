-- Plantbase — read-only DB-szerepkör (NFR1, architektura.md 2. pont).
-- A Prisma a `plantbase` (RW) userrel viszi a sémát/migrációt/seedet.
-- Az agent runSql toolja EZT a szerepkört használja, csak SELECT-tel.
-- A .env DATABASE_URL_READONLY hitelesítő adataival egyezik.

CREATE ROLE plantbase_ro WITH LOGIN PASSWORD 'plantbase_ro';

GRANT CONNECT ON DATABASE plantbase TO plantbase_ro;
GRANT USAGE ON SCHEMA public TO plantbase_ro;

-- A products tábla a migráció során, a `plantbase` (RW) userrel jön létre,
-- ezért itt még nem létezik: a jövőbeli táblákra öröklődő alapértelmezett
-- jogosultsággal adjuk meg előre a csak-SELECT hozzáférést.
ALTER DEFAULT PRIVILEGES FOR ROLE plantbase IN SCHEMA public
  GRANT SELECT ON TABLES TO plantbase_ro;

-- Ha a migráció már lefutott (pl. újraindításkor), a meglévő táblákra is:
DO $$
BEGIN
  EXECUTE (
    SELECT COALESCE(
      string_agg(
        format('GRANT SELECT ON TABLE %I TO plantbase_ro;', tablename),
        ' '
      ),
      ''
    )
    FROM pg_tables
    WHERE schemaname = 'public'
  );
END $$;
