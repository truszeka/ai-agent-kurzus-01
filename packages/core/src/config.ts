import { z } from 'zod';

const ConfigSchema = z.object({
  databaseUrlReadonly: z.string().min(1),
  anthropicModel: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const ENV_VAR_NAMES: Record<keyof Config, string> = {
  databaseUrlReadonly: 'DATABASE_URL_READONLY',
  anthropicModel: 'ANTHROPIC_MODEL',
};

let cachedConfig: Config | undefined;

function parseConfig(env: NodeJS.ProcessEnv): Config {
  // Az Anthropic SDK a hitelesítést maga oldja meg (ANTHROPIC_API_KEY vagy
  // ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL, pl. OpenRouter-proxyn keresztül),
  // ezért ezt itt nem kényszerítjük ki.
  const result = ConfigSchema.safeParse({
    databaseUrlReadonly: env['DATABASE_URL_READONLY'],
    anthropicModel: env['ANTHROPIC_MODEL'],
  });

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => ENV_VAR_NAMES[issue.path.join('') as keyof Config])
      .join(', ');
    throw new Error(`Hiányzó vagy érvénytelen környezeti változó(k): ${missing}`);
  }

  return result.data;
}

/**
 * Fail-fast config validáció: induláskor egyszer olvassa és validálja a
 * kötelező env-eket, utána a folyamat teljes élettartama alatt gyorsítótárazza.
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = parseConfig(process.env);
  }
  return cachedConfig;
}

export function resetConfigForTests(): void {
  cachedConfig = undefined;
}
