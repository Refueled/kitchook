import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { z } from 'astro/zod';
import {
  DEFAULT_RECIPE_STATUS,
  PUBLISHED_RECIPE_STATUS,
  RECIPE_DIFFICULTIES,
  RECIPE_STATUSES,
  createRecipeFrontmatterSchema,
  isValidRecipeSlug,
  recipeFrontmatterFields,
  toRecipeSlug,
} from '@kitchook/recipe-schema';

const minimal = { title: 'Garlic Butter Pasta' };

test('constants match the contract used by the generator', () => {
  assert.deepEqual([...RECIPE_STATUSES], ['active', 'draft', 'archived']);
  assert.deepEqual([...RECIPE_DIFFICULTIES], ['easy', 'medium', 'hard']);
  assert.equal(DEFAULT_RECIPE_STATUS, 'active');
  assert.equal(PUBLISHED_RECIPE_STATUS, 'active');
});

test('slug helpers recognise exactly the directory names the build accepts', () => {
  for (const slug of ['a', 'garlic-butter-pasta', 'mango-avocado-salsa-salad', 'x1-y2']) {
    assert.equal(isValidRecipeSlug(slug), true, slug);
  }

  for (const slug of ['', 'Uppercase', 'trailing-', '-leading', 'double--dash', 'has space', 'a/b', null, 7]) {
    assert.equal(isValidRecipeSlug(slug), false, String(slug));
  }
});

test('toRecipeSlug derives build-valid slugs from titles', () => {
  assert.equal(toRecipeSlug('Garlic Butter Pasta'), 'garlic-butter-pasta');
  assert.equal(toRecipeSlug('  Crème Brûlée!! '), 'creme-brulee');
  assert.equal(toRecipeSlug('Korean Ground Beef Bowl'), 'korean-ground-beef-bowl');
  assert.equal(isValidRecipeSlug(toRecipeSlug('Mango & Avocado Salsa/Salad')), true);
});

test('schema applies the documented defaults', () => {
  const parsed = createRecipeFrontmatterSchema(z).parse(minimal);

  assert.deepEqual(parsed.aliases, []);
  assert.deepEqual(parsed.tags, []);
  assert.deepEqual(parsed.categories, []);
  assert.deepEqual(parsed.cuisine, []);
  assert.deepEqual(parsed.meal, []);
  assert.equal(parsed.favorite, false);
  assert.equal(parsed.status, 'active');
});

test('schema rejects unknown fields and invalid values', () => {
  const schema = createRecipeFrontmatterSchema(z);

  assert.equal(schema.safeParse({ ...minimal, surprise: true }).success, false);
  assert.equal(schema.safeParse({ title: '   ' }).success, false);
  assert.equal(schema.safeParse({ title: 'x', status: 'published' }).success, false);
  assert.equal(schema.safeParse({ title: 'x', difficulty: 'extreme' }).success, false);
  assert.equal(schema.safeParse({ title: 'x', prep_minutes: -1 }).success, false);
  assert.equal(schema.safeParse({ title: 'x', source: { url: 'not-a-url' } }).success, false);
  assert.equal(schema.safeParse({ title: 'x', source: { extra: 'nope' } }).success, false);
});

test('schema accepts the documented field shapes', () => {
  const parsed = createRecipeFrontmatterSchema(z).parse({
    title: 'Chicken Tikka Masala',
    description: 'Creamy tomato-based chicken curry.',
    aliases: ['Chicken Tikka'],
    tags: ['chicken', 'curry'],
    categories: ['dinner'],
    cuisine: ['indian'],
    meal: ['dinner'],
    prep_minutes: 20,
    cook_minutes: 35,
    total_minutes: 85,
    servings: 'Makes 2 loaves',
    difficulty: 'medium',
    favorite: true,
    source: { name: 'Example', url: 'https://example.com/recipe' },
    created: '2026-03-01',
    updated: '2026-03-01',
    status: 'draft',
  });

  assert.equal(parsed.servings, 'Makes 2 loaves');
  assert.equal(parsed.created instanceof Date, true);
  assert.equal(parsed.status, 'draft');
});

test('schema omits image so each consumer can define it', () => {
  const fields = recipeFrontmatterFields(z);
  assert.equal('image' in fields, false);
  assert.equal(createRecipeFrontmatterSchema(z).safeParse({ ...minimal, image: 'hero.jpg' }).success, false);
});

test('the committed frontmatter reference stays in step with the schema', () => {
  // The docs table and this schema must not drift; the generator's own
  // schema.json is derived from the same fields.
  const documented = readFileSync(new URL('../docs/authoring.md', import.meta.url), 'utf8');
  for (const field of Object.keys(recipeFrontmatterFields(z))) {
    assert.match(documented, new RegExp(`\\\`${field}\\\``), `docs/authoring.md must document ${field}`);
  }
});
