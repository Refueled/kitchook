import assert from 'node:assert/strict';
import test from 'node:test';
import MiniSearch from 'minisearch';
import {
  extractIngredientSections,
  matchesSearchFilters,
  normalizeRecipe,
  recipeSearchOptions,
  searchIndexOptions,
} from '../src/lib/search.ts';

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
      cuisine: [],
      meal: [],
      favorite: data.favorite ?? false,
      status: 'active',
      total_minutes: data.total_minutes,
      servings: data.servings,
      difficulty: data.difficulty,
    },
  };
}

const chicken = recipe(
  'chicken-tikka-masala',
  {
    title: 'Chicken Tikka Masala',
    aliases: ['Chicken Tikka'],
    tags: ['chicken', 'curry', 'weeknight'],
    categories: ['dinner'],
    favorite: true,
    total_minutes: 85,
    servings: 4,
    difficulty: 'easy',
  },
  `## Ingredients

### Chicken

- chicken thighs
- 2 tsp garam masala

## Instructions

1. Simmer the curry.`,
);

const bodyOnly = recipe(
  'weeknight-rice',
  {
    title: 'Weeknight Rice',
    tags: ['quick'],
    categories: ['side'],
  },
  `## Ingredients

- rice

## Instructions

1. Toasting garam masala nearby will perfume the kitchen.`,
);

test('extractIngredientSections includes every matching level-two section only', () => {
  const body = `## Ingredients

- rice

### Sauce

- soy sauce

## Optional Ingredients ###

Vegetables: broccoli

## Instructions

1. Add forbidden instruction text.

### Ingredients

This is not a level-two section.`;
  const ingredients = extractIngredientSections(body);

  assert.match(ingredients, /rice/);
  assert.match(ingredients, /soy sauce/);
  assert.match(ingredients, /Vegetables: broccoli/);
  assert.doesNotMatch(ingredients, /forbidden instruction/);
  assert.doesNotMatch(ingredients, /not a level two section/);
});

test('normalizeRecipe creates compact indexed and stored fields', () => {
  const normalized = normalizeRecipe(chicken);

  assert.equal(normalized.id, 'chicken-tikka-masala');
  assert.equal(normalized.url, '/recipes/chicken-tikka-masala/');
  assert.equal(normalized.aliases, 'Chicken Tikka');
  assert.equal(normalized.tags, 'chicken curry weeknight');
  assert.equal(normalized.categories, 'dinner');
  assert.deepEqual(normalized.categoryValues, ['dinner']);
  assert.deepEqual(normalized.tagValues, ['chicken', 'curry', 'weeknight']);
  assert.match(normalized.ingredients, /garam masala/);
  assert.equal(normalized.totalMinutes, 85);
});

test('MiniSearch supports typo, prefix, ingredient ranking, and all-term matching', () => {
  const index = new MiniSearch(searchIndexOptions);
  index.addAll([normalizeRecipe(chicken), normalizeRecipe(bodyOnly)]);

  assert.equal(index.search('chiken tikka', recipeSearchOptions)[0]?.id, chicken.id);
  assert.equal(index.search('gara', recipeSearchOptions)[0]?.id, chicken.id);

  const ingredientResults = index.search('garam masala', recipeSearchOptions);
  assert.equal(ingredientResults[0]?.id, chicken.id);
  assert.ok(ingredientResults[0].score > ingredientResults[1].score);
  assert.deepEqual(index.search('chicken nonexistent', recipeSearchOptions), []);
});

test('filters use AND between groups and OR within category and tag groups', () => {
  const dinnerFavorite = {
    favorite: true,
    categoryValues: ['dinner'],
    tagValues: ['curry', 'weeknight'],
  };
  const filters = {
    favorite: true,
    categories: ['dinner', 'lunch'],
    tags: ['quick', 'curry'],
  };

  assert.equal(matchesSearchFilters(dinnerFavorite, filters), true);
  assert.equal(
    matchesSearchFilters({ ...dinnerFavorite, favorite: false }, filters),
    false,
  );
  assert.equal(
    matchesSearchFilters({ ...dinnerFavorite, categoryValues: ['dessert'] }, filters),
    false,
  );
  assert.equal(
    matchesSearchFilters({ ...dinnerFavorite, tagValues: ['slow'] }, filters),
    false,
  );
});

test('serialized index restores with the shared options and preserves wildcard order', () => {
  const index = new MiniSearch(searchIndexOptions);
  index.addAll([normalizeRecipe(chicken), normalizeRecipe(bodyOnly)]);
  const restored = MiniSearch.loadJSON(JSON.stringify(index), searchIndexOptions);

  assert.deepEqual(
    restored.search(MiniSearch.wildcard).map(({ id }) => id),
    [chicken.id, bodyOnly.id],
  );
  assert.equal(restored.documentCount, 2);
});
