import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A jóváhagyott, teljes system promptot tölti be a repo `docs/system-prompt.md`
 * fájljából — a tartalom szándékosan nem duplikált a kódban (implementacios-terv.md 0. pont).
 * A CLI-t a repo gyökeréről futtatjuk, ezért a docs/ ott elérhető.
 */
export function loadSystemPrompt(path?: string): string {
  return readFileSync(path ?? join(process.cwd(), 'docs', 'system-prompt.md'), 'utf8');
}
