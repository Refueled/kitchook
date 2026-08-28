import type { APIRoute } from 'astro';
import { normalizeRecipeExport } from '../../lib/recipe-export';
import { getPublishedRecipes } from '../../lib/recipes';

export const prerender = true;

export const GET: APIRoute = async () => {
  const recipes = await getPublishedRecipes();
  const exportedRecipes = recipes.map(normalizeRecipeExport);

  return new Response(JSON.stringify(exportedRecipes), {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
