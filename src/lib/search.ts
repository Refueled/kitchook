import type { Options, SearchOptions, SearchResult } from 'minisearch';
import { compactMarkdown, extractIngredientSections } from './recipe-markdown.ts';
import type { RecipeEntry } from './recipes';

export { extractIngredientSections } from './recipe-markdown.ts';

export const SEARCH_FIELDS = [
  'title',
  'aliases',
  'tags',
  'categories',
  'ingredients',
  'description',
  'body',
] as const;

export const SEARCH_STORE_FIELDS = [
  'url',
  'title',
  'description',
  'favorite',
  'categoryValues',
  'tagValues',
  'totalMinutes',
  'servings',
  'difficulty',
] as const;

export const SEARCH_FIELD_BOOSTS = {
  title: 10,
  aliases: 9,
  tags: 7,
  categories: 6,
  ingredients: 5,
  description: 3,
  body: 1,
} as const;

export interface SearchDocument {
  id: string;
  url: string;
  title: string;
  aliases: string;
  tags: string;
  categories: string;
  ingredients: string;
  description: string;
  body: string;
  favorite: boolean;
  categoryValues: string[];
  tagValues: string[];
  totalMinutes?: number;
  servings?: number | string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface SearchFilters {
  favorite: boolean;
  categories: string[];
  tags: string[];
}

export type StoredSearchResult = SearchResult &
  Pick<
    SearchDocument,
    | 'url'
    | 'title'
    | 'description'
    | 'favorite'
    | 'categoryValues'
    | 'tagValues'
    | 'totalMinutes'
    | 'servings'
    | 'difficulty'
  >;

export const searchIndexOptions: Options<SearchDocument> = {
  fields: [...SEARCH_FIELDS],
  storeFields: [...SEARCH_STORE_FIELDS],
};

export const recipeSearchOptions: SearchOptions = {
  boost: SEARCH_FIELD_BOOSTS,
  combineWith: 'AND',
  prefix: true,
  fuzzy: (term) => (term.length > 3 ? 0.2 : false),
};

export function normalizeRecipe(recipe: RecipeEntry): SearchDocument {
  const { data } = recipe;
  const body = recipe.body ?? '';

  return {
    id: recipe.id,
    url: `/recipes/${recipe.id}/`,
    title: data.title,
    aliases: data.aliases.join(' '),
    tags: data.tags.join(' '),
    categories: data.categories.join(' '),
    ingredients: extractIngredientSections(body),
    description: data.description ?? '',
    body: compactMarkdown(body),
    favorite: data.favorite,
    categoryValues: [...data.categories],
    tagValues: [...data.tags],
    ...(data.total_minutes !== undefined ? { totalMinutes: data.total_minutes } : {}),
    ...(data.servings !== undefined ? { servings: data.servings } : {}),
    ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
  };
}

export function matchesSearchFilters(
  result: Pick<StoredSearchResult, 'favorite' | 'categoryValues' | 'tagValues'>,
  filters: SearchFilters,
): boolean {
  if (filters.favorite && !result.favorite) return false;
  if (
    filters.categories.length > 0 &&
    !filters.categories.some((category) => result.categoryValues.includes(category))
  ) {
    return false;
  }
  if (filters.tags.length > 0 && !filters.tags.some((tag) => result.tagValues.includes(tag))) {
    return false;
  }
  return true;
}
