import { extractIngredientLines } from './recipe-markdown.ts';
import type { RecipeEntry } from './recipes';

export interface RecipeExportSource {
  name?: string;
  url?: string;
}

export interface RecipeExportImage {
  src: string;
  width: number;
  height: number;
  format: string;
}

export interface RecipeExport {
  slug: string;
  url: string;
  title: string;
  body: string;
  description?: string;
  aliases?: string[];
  tags?: string[];
  categories?: string[];
  cuisine?: string[];
  meal?: string[];
  ingredients?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  servings?: number | string;
  difficulty?: 'easy' | 'medium' | 'hard';
  favorite?: true;
  source?: RecipeExportSource;
  created?: string;
  updated?: string;
  image?: RecipeExportImage;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rootRelativeImageSource(src: string): string {
  if (src.startsWith('/')) return src;
  return `/${src.replace(/^(?:\.\/)+/, '')}`;
}

export function normalizeRecipeExport(recipe: RecipeEntry): RecipeExport {
  const { data } = recipe;
  const body = (recipe.body ?? '').trim();
  const ingredients = extractIngredientLines(body);
  const source = data.source
    ? {
        ...(data.source.name ? { name: data.source.name } : {}),
        ...(data.source.url ? { url: data.source.url } : {}),
      }
    : undefined;

  return {
    slug: recipe.id,
    url: `/recipes/${recipe.id}/`,
    title: data.title,
    body,
    ...(data.description ? { description: data.description } : {}),
    ...(data.aliases.length > 0 ? { aliases: [...data.aliases] } : {}),
    ...(data.tags.length > 0 ? { tags: [...data.tags] } : {}),
    ...(data.categories.length > 0 ? { categories: [...data.categories] } : {}),
    ...(data.cuisine.length > 0 ? { cuisine: [...data.cuisine] } : {}),
    ...(data.meal.length > 0 ? { meal: [...data.meal] } : {}),
    ...(ingredients.length > 0 ? { ingredients } : {}),
    ...(data.prep_minutes !== undefined ? { prepMinutes: data.prep_minutes } : {}),
    ...(data.cook_minutes !== undefined ? { cookMinutes: data.cook_minutes } : {}),
    ...(data.total_minutes !== undefined ? { totalMinutes: data.total_minutes } : {}),
    ...(data.servings !== undefined ? { servings: data.servings } : {}),
    ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
    ...(data.favorite ? { favorite: true as const } : {}),
    ...(source && Object.keys(source).length > 0 ? { source } : {}),
    ...(data.created ? { created: dateOnly(data.created) } : {}),
    ...(data.updated ? { updated: dateOnly(data.updated) } : {}),
    ...(data.image
      ? {
          image: {
            src: rootRelativeImageSource(data.image.src),
            width: data.image.width,
            height: data.image.height,
            format: data.image.format,
          },
        }
      : {}),
  };
}
