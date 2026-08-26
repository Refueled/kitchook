import type { APIRoute } from 'astro';
import MiniSearch from 'minisearch';
import { getPublishedRecipes } from '../../lib/recipes';
import { normalizeRecipe, searchIndexOptions, type SearchDocument } from '../../lib/search';

export const prerender = true;

export const GET: APIRoute = async () => {
  const recipes = await getPublishedRecipes();

  if (recipes.length === 0) {
    throw new Error('Cannot build an empty recipe search index.');
  }
  if (recipes.some(({ data }) => data.status !== 'active')) {
    throw new Error('Unpublished recipes must not enter the recipe search index.');
  }

  const documents = recipes.map(normalizeRecipe);
  const ids = new Set(documents.map(({ id }) => id));

  if (ids.size !== documents.length) {
    throw new Error('Cannot build a recipe search index with duplicate recipe IDs.');
  }

  const index = new MiniSearch<SearchDocument>(searchIndexOptions);
  index.addAll(documents);

  if (index.documentCount !== recipes.length) {
    throw new Error('Recipe search index document count does not match active recipes.');
  }

  return new Response(JSON.stringify(index), {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
