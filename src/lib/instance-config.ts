import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';

const configFileName = 'instance.config.json';

const instanceConfigSchema = z
  .object({
    title: z.string().trim().min(1, 'title must not be blank.'),
    description: z.string().trim().min(1, 'description must not be blank.'),
    canonicalOrigin: z.string().url().optional(),
  })
  .strict();

export type InstanceConfig = z.infer<typeof instanceConfigSchema>;

export function getContentDirectory(): string {
  return resolve(process.env.KITCHOOK_CONTENT_DIR || '.');
}

export function loadInstanceConfig(contentDirectory = getContentDirectory()): InstanceConfig {
  const configPath = resolve(contentDirectory, configFileName);
  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read instance configuration at ${configPath}: ${reason}`);
  }

  const result = instanceConfigSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'configuration'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid instance configuration at ${configPath}: ${details}`);
  }

  if (result.data.canonicalOrigin) {
    const origin = new URL(result.data.canonicalOrigin);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    ) {
      throw new Error(
        `Invalid instance configuration at ${configPath}: canonicalOrigin must be an HTTP(S) origin without a path, query, or fragment.`,
      );
    }
    result.data.canonicalOrigin = origin.origin;
  }

  return result.data;
}

export const instanceConfig = loadInstanceConfig();
