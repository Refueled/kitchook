import { resolve } from 'node:path';
import { defineConfig } from 'astro/config';

const outputDirectory = process.env.KITCHOOK_OUTPUT_DIR;

export default defineConfig({
  ...(outputDirectory ? { outDir: resolve(outputDirectory) } : {}),
});
