import type Anthropic from '@anthropic-ai/sdk';

export const RUN_SQL_TOOL_NAME = 'runSql';
export const LIST_CATEGORIES_TOOL_NAME = 'listCategories';

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: RUN_SQL_TOOL_NAME,
    description:
      'Biztonságos, read-only SELECT lekérdezést futtat a products táblán. ' +
      'Kizárólag SELECT, kötelező LIMIT (max 50), csak a products táblára hivatkozhat.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'A futtatandó SELECT SQL lekérdezés a products táblán.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: LIST_CATEGORIES_TOOL_NAME,
    description: 'Visszaadja a products táblában elérhető összes egyedi kategóriát.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];
