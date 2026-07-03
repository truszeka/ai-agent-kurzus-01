const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'ALTER',
  'DROP',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'MERGE',
];

const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

export class SqlGuardError extends Error {}

/**
 * Elutasítja mindazt, ami nem egyetlen, biztonságos, `products`-ra
 * korlátozott SELECT — a runSql tool utolsó védelmi rétege (docs/system-prompt.md 5. pont).
 */
export function assertSafeSelect(sql: string): void {
  const trimmed = sql.trim();

  if (trimmed.length === 0) {
    throw new SqlGuardError('Az SQL lekérdezés nem lehet üres.');
  }

  if (/--|\/\*/.test(trimmed)) {
    throw new SqlGuardError('Az SQL lekérdezésben nem megengedett a komment.');
  }

  const statement = trimmed.replace(/;\s*$/, '');
  if (statement.includes(';')) {
    throw new SqlGuardError('Egyszerre csak egy SQL utasítás futtatható.');
  }

  if (!/^select\b/i.test(statement)) {
    throw new SqlGuardError('Csak SELECT lekérdezés engedélyezett.');
  }

  const forbiddenPattern = new RegExp(`\\b(${FORBIDDEN_KEYWORDS.join('|')})\\b`, 'i');
  if (forbiddenPattern.test(statement)) {
    throw new SqlGuardError('A lekérdezés tiltott kulcsszót tartalmaz.');
  }

  if (/\bjoin\b/i.test(statement)) {
    throw new SqlGuardError('A lekérdezés csak a products táblára hivatkozhat, JOIN nem megengedett.');
  }

  if (!/\bfrom\s+products\b/i.test(statement)) {
    throw new SqlGuardError('A lekérdezés csak a products táblára hivatkozhat.');
  }

  const limitMatch = /\blimit\s+(\d+)\b/i.exec(statement);
  if (!limitMatch) {
    throw new SqlGuardError('A lekérdezésben kötelező a LIMIT.');
  }

  const limitValue = Number(limitMatch[1]);
  if (limitValue < MIN_LIMIT || limitValue > MAX_LIMIT) {
    throw new SqlGuardError(`A LIMIT értéke ${MIN_LIMIT} és ${MAX_LIMIT} között lehet.`);
  }
}
