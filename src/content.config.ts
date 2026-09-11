import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { resolve } from 'node:path';
import {
  recipeFrontmatterFields,
  isValidRecipeSlug,
} from '@kitchook/recipe-schema';
import { getContentDirectory } from './lib/instance-config';

const recipes = defineCollection({
  loader: glob({
    base: resolve(getContentDirectory(), 'recipes'),
    pattern: '*/recipe.md',
    generateId: ({ entry }) => {
      const parts = entry.split('/');
      const slug = parts.at(-2);

      if (!slug || !isValidRecipeSlug(slug)) {
        throw new Error(
          `Recipe directory "${slug ?? ''}" must be a lowercase kebab-case slug.`,
        );
      }

      return slug;
    },
  }),
  // The shared contract owns every field except `image`, which Astro resolves
  // here as a build-validated asset rather than the plain relative path other
  // consumers (such as the content manager) see.
  schema: ({ image }) =>
    z
      .object({
        ...recipeFrontmatterFields(z),
        image: image().optional(),
      })
      .strict(),
});

export const collections = { recipes };
