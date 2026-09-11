/**
 * The canonical KitchooK! recipe frontmatter contract.
 *
 * This package is deliberately dependency-free and Zod-instance agnostic. The
 * generator loads `z` from `astro/zod`, while other consumers (the content
 * manager, CLI tooling, tests) bring their own copy. A schema built from one
 * Zod copy cannot safely be composed with another copy's helpers, so callers
 * pass their own namespace in through {@link recipeFrontmatterFields} rather
 * than importing a shared instance here.
 *
 * The `image` field is intentionally absent: the generator resolves it with
 * Astro's `image()` helper, while every other consumer treats it as a relative
 * path string. Callers add it themselves.
 */

/** Publication states a recipe may declare. */
export const RECIPE_STATUSES = Object.freeze(['active', 'draft', 'archived']);

/** Difficulty values a recipe may declare. */
export const RECIPE_DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);

/** Recipe directory names, which are also the published URL slugs. */
export const RECIPE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Status applied when frontmatter omits `status`. */
export const DEFAULT_RECIPE_STATUS = 'active';

/** Status of recipes that receive routes, search entries, and JSON export. */
export const PUBLISHED_RECIPE_STATUS = 'active';

/**
 * @param {unknown} value
 * @returns {boolean} whether `value` is a valid recipe slug / directory name.
 */
export function isValidRecipeSlug(value) {
  return typeof value === 'string' && RECIPE_SLUG_PATTERN.test(value);
}

/**
 * Derive a valid recipe slug from arbitrary text, for example a recipe title
 * typed into an "add recipe" form.
 *
 * @param {unknown} input
 * @returns {string} a lowercase kebab-case slug, possibly empty.
 */
export function toRecipeSlug(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build the recipe frontmatter field definitions using the caller's Zod
 * namespace. The result is the raw shape; callers decide whether to add
 * `image` and how to wrap it (`.strict()` is expected everywhere).
 *
 * @param {any} z the caller's Zod namespace (`zod` or `astro/zod`)
 * @returns {Record<string, any>} field definitions for `z.object(...)`
 */
export function recipeFrontmatterFields(z) {
  const nonEmptyString = z.string().trim().min(1);
  const stringList = z.array(nonEmptyString).default([]);
  const minutes = z.number().int().nonnegative();

  return {
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
    difficulty: z.enum([...RECIPE_DIFFICULTIES]).optional(),
    favorite: z.boolean().default(false),
    source: z
      .object({
        name: nonEmptyString.optional(),
        url: z.url().optional(),
      })
      .strict()
      .optional(),
    created: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    status: z.enum([...RECIPE_STATUSES]).default(DEFAULT_RECIPE_STATUS),
  };
}

/**
 * The complete strict recipe frontmatter schema, excluding `image`.
 *
 * @param {any} z the caller's Zod namespace
 * @returns {any} a strict Zod object schema
 */
export function createRecipeFrontmatterSchema(z) {
  return z.object(recipeFrontmatterFields(z)).strict();
}
