import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRecipeExport } from '../src/lib/recipe-export.ts';

function recipe(id, data, body) {
  return {
    id,
    body,
    data: {
      title: data.title,
      description: data.description,
      aliases: data.aliases ?? [],
      tags: data.tags ?? [],
      categories: data.categories ?? [],
      cuisine: data.cuisine ?? [],
      meal: data.meal ?? [],
      prep_minutes: data.prep_minutes,
      cook_minutes: data.cook_minutes,
      total_minutes: data.total_minutes,
      servings: data.servings,
      difficulty: data.difficulty,
      favorite: data.favorite ?? false,
      image: data.image,
      source: data.source,
      created: data.created,
      updated: data.updated,
      status: 'active',
    },
  };
}

test('normalizeRecipeExport emits the complete public contract', () => {
  const full = recipe(
    'full-recipe',
    {
      title: 'Full Recipe',
      description: 'Every supported field.',
      aliases: ['Alternate Name'],
      tags: ['quick'],
      categories: ['dinner'],
      cuisine: ['fusion'],
      meal: ['supper'],
      prep_minutes: 10,
      cook_minutes: 20,
      total_minutes: 35,
      servings: '4 bowls',
      difficulty: 'medium',
      favorite: true,
      source: {
        name: 'Example Source',
        url: 'https://example.com/full-recipe',
      },
      created: new Date('2026-01-02T00:00:00.000Z'),
      updated: new Date('2026-02-03T23:59:59.000Z'),
      image: {
        src: '_astro/hero.hash.jpg',
        width: 1200,
        height: 800,
        format: 'jpg',
      },
    },
    `\n## Ingredients\n\n### Main\n\n- 1 cup rice\n* 2 tsp **spice**\n\n## Optional Ingredients ###\n\nVegetables: broccoli or peas.\n\n## Instructions\n\n1. Cook.\n`,
  );

  assert.deepEqual(normalizeRecipeExport(full), {
    slug: 'full-recipe',
    url: '/recipes/full-recipe/',
    title: 'Full Recipe',
    body: '## Ingredients\n\n### Main\n\n- 1 cup rice\n* 2 tsp **spice**\n\n## Optional Ingredients ###\n\nVegetables: broccoli or peas.\n\n## Instructions\n\n1. Cook.',
    description: 'Every supported field.',
    aliases: ['Alternate Name'],
    tags: ['quick'],
    categories: ['dinner'],
    cuisine: ['fusion'],
    meal: ['supper'],
    ingredients: ['1 cup rice', '2 tsp **spice**', 'Vegetables: broccoli or peas.'],
    prepMinutes: 10,
    cookMinutes: 20,
    totalMinutes: 35,
    servings: '4 bowls',
    difficulty: 'medium',
    favorite: true,
    source: {
      name: 'Example Source',
      url: 'https://example.com/full-recipe',
    },
    created: '2026-01-02',
    updated: '2026-02-03',
    image: {
      src: '/_astro/hero.hash.jpg',
      width: 1200,
      height: 800,
      format: 'jpg',
    },
  });
});

test('normalizeRecipeExport omits empty metadata and schema defaults', () => {
  const minimal = recipe(
    'minimal-recipe',
    {
      title: 'Minimal Recipe',
      source: {},
    },
    `\n\n## Ingredients\n\n- Salt to taste\n\n## Instructions\n\n1. Season.\n\n`,
  );

  assert.deepEqual(normalizeRecipeExport(minimal), {
    slug: 'minimal-recipe',
    url: '/recipes/minimal-recipe/',
    title: 'Minimal Recipe',
    body: '## Ingredients\n\n- Salt to taste\n\n## Instructions\n\n1. Season.',
    ingredients: ['Salt to taste'],
  });
});

test('normalizeRecipeExport copies frontmatter arrays defensively', () => {
  const input = recipe(
    'copied-arrays',
    {
      title: 'Copied Arrays',
      aliases: ['Alias'],
      tags: ['tag'],
      categories: ['category'],
      cuisine: ['cuisine'],
      meal: ['meal'],
    },
    'Recipe body without an ingredient section.',
  );
  const exported = normalizeRecipeExport(input);

  for (const field of ['aliases', 'tags', 'categories', 'cuisine', 'meal']) {
    assert.notStrictEqual(exported[field], input.data[field]);
  }

  input.data.aliases.push('Later input change');
  exported.tags.push('Later output change');
  assert.deepEqual(exported.aliases, ['Alias']);
  assert.deepEqual(input.data.tags, ['tag']);
});
