import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const nonEmptyString = z.string().trim().min(1);
const stringList = z.array(nonEmptyString).default([]);
const minutes = z.number().int().nonnegative();

const recipes = defineCollection({
  loader: glob({
    base: './recipes',
    pattern: '*/recipe.md',
    generateId: ({ entry }) => {
      const parts = entry.split('/');
      const slug = parts.at(-2);

      if (!slug || !slugPattern.test(slug)) {
        throw new Error(
          `Recipe directory "${slug ?? ''}" must be a lowercase kebab-case slug.`,
        );
      }

      return slug;
    },
  }),
  schema: ({ image }) =>
    z
      .object({
        title: nonEmptyString,
        description: nonEmptyString.optional(),
        aliases: stringList,
        tags: stringList,
        categories: stringList,
        cuisine: stringList,
        meal: stringList,
        prep_minutes: minutes.optional(),
        cook_minutes: minutes.optional(),
        total_minutes: minutes.optional(),
        servings: z
          .union([z.number().int().nonnegative(), nonEmptyString])
          .optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        favorite: z.boolean().default(false),
        image: image().optional(),
        source: z
          .object({
            name: nonEmptyString.optional(),
            url: z.url().optional(),
          })
          .strict()
          .optional(),
        created: z.coerce.date().optional(),
        updated: z.coerce.date().optional(),
        status: z.enum(['active', 'draft', 'archived']).default('active'),
      })
      .strict(),
});

export const collections = { recipes };
