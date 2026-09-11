/** Publication states a recipe may declare. */
export type RecipeStatus = 'active' | 'draft' | 'archived';

/** Difficulty values a recipe may declare. */
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export declare const RECIPE_STATUSES: readonly RecipeStatus[];
export declare const RECIPE_DIFFICULTIES: readonly RecipeDifficulty[];
export declare const RECIPE_SLUG_PATTERN: RegExp;
export declare const DEFAULT_RECIPE_STATUS: RecipeStatus;
export declare const PUBLISHED_RECIPE_STATUS: RecipeStatus;

/**
 * Recipe frontmatter as it appears in `recipe.md`, after schema defaults are
 * applied and excluding the consumer-specific `image` field.
 */
export interface RecipeFrontmatter {
  title: string;
  description?: string;
  aliases: string[];
  tags: string[];
  categories: string[];
  cuisine: string[];
  meal: string[];
  prep_minutes?: number;
  cook_minutes?: number;
  total_minutes?: number;
  servings?: number | string;
  difficulty?: RecipeDifficulty;
  favorite: boolean;
  source?: { name?: string; url?: string };
  created?: Date;
  updated?: Date;
  status: RecipeStatus;
}

export declare function isValidRecipeSlug(value: unknown): boolean;
export declare function toRecipeSlug(input: unknown): string;

/**
 * Build the recipe frontmatter field definitions using the caller's Zod
 * namespace. Pass `z` from `astro/zod` in the generator, or from `zod`
 * elsewhere. `image` is deliberately not included.
 *
 * @param z the caller's Zod namespace
 */
export declare function recipeFrontmatterFields(
  z: any,
): Record<string, any>;

/**
 * The complete strict recipe frontmatter schema, excluding `image`.
 *
 * @param z the caller's Zod namespace
 */
export declare function createRecipeFrontmatterSchema(z: any): any;
