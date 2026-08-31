import { getCollection, type CollectionEntry } from 'astro:content';

export type RecipeEntry = CollectionEntry<'recipes'>;

export async function getPublishedRecipes(): Promise<RecipeEntry[]> {
  const recipes = await getCollection('recipes');

  for (const recipe of recipes) {
    if (recipe.data.status === 'active' && !recipe.body?.trim()) {
      throw new Error(`Active recipe "${recipe.id}" must have a non-empty Markdown body.`);
    }
  }

  const published = recipes
    .filter((recipe) => recipe.data.status === 'active')
    .sort(
      (left, right) =>
        left.data.title.localeCompare(right.data.title, 'en') ||
        left.id.localeCompare(right.id, 'en'),
    );

  if (published.length === 0) {
    throw new Error('A cookbook must contain at least one active recipe.');
  }

  return published;
}
