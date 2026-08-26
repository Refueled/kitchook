# Phase 3 — Search Implementation Plan

> **Status: Complete.** Implemented, validated, manually accepted, and shipped in commit `d9ec086`.

## Context

Phase 3 implements the search architecture defined by `PROJECT_PLAN.md` on top of the completed Astro 7 static cookbook UI. Canonical recipes remain in top-level `recipes/`; only active recipes are searchable. Search must be client-side, fast, fuzzy/prefix-aware, metadata-aware, and usable without introducing a backend or UI framework.

Current baseline:

- `src/content.config.ts` validates recipe metadata and derives stable IDs from recipe directories.
- `src/lib/recipes.ts#getPublishedRecipes` is the single active-recipe query and alphabetical ordering boundary.
- `src/components/RecipeCard.astro` is the existing visual result representation.
- `src/pages/index.astro` currently provides an alphabetized browse grid without search.
- `src/styles/global.css` and `docs/BRAND.md` define the responsive neobrutalist UI and accessibility conventions to preserve.
- The project currently has no client-side dependencies, test command, or search/export pipeline.

## Approach

1. Add a shared recipe-normalization layer that turns each published Astro collection entry into a compact, JSON-safe search document. Extract all level-two sections whose headings end in “Ingredients” (covering both `## Ingredients` and the existing `## Optional Ingredients`) while retaining lower-weight body text, and flatten aliases/taxonomy fields for MiniSearch.
2. Build and serialize the MiniSearch index at build time with the field boosts specified in `PROJECT_PLAN.md`. Implement the “build script” as an Astro static JSON endpoint at `src/pages/search/index.json.ts`: Astro invokes it inside the content-collection build context and emits `dist/search/index.json`, avoiding a coupled post-build script and making the same artifact available during development. Store only compact result/filter fields in the serialized index; MiniSearch’s wildcard query supports filter-only browsing without a second metadata payload.
3. Add a progressively enhanced `/search/` page. Astro renders the search form, build-derived category/tag options, empty/help state, and noscript fallback; a small plain TypeScript module fetches the serialized index only when the page is used, restores MiniSearch, runs debounced prefix/fuzzy searches, filters stored metadata, and renders accessible compact results.
4. Add a large search entry point immediately below the homepage intro, and responsive header search on content pages only. On desktop, preserve the wordmark at left and “Cook from the source.” at right while centering a compact search form between them. On mobile, continue hiding the tagline and use its top-right position for a search-icon `<summary>` inside native `<details>`; activating it expands a full-width search row beneath the header’s first row. A tiny enhancement moves focus into the opened input and lets Escape close it, while the disclosure remains functional without JavaScript and consumes no collapsed vertical space. Both forms submit to `/search/?q=...`. The homepage and search page omit header search because they each render their own large input.
5. Render compact text-based search results (no image payload), reusing the existing recipe metadata vocabulary and card visual language without reproducing full `RecipeCard` image cards.
6. Add focused automated coverage for normalization, index behavior, filter behavior, and generated artifact integrity.

Phase 3 filters are limited to favorite, category, and tag. Total time may remain compact result-display metadata, but it is not an indexed search field and the web client will not expose a time query/filter. Natural-language time intent belongs to a future AI/API phase.

## Files to modify

Critical paths:

- `package.json`
- `package-lock.json`
- `src/lib/search.ts` (new; normalization plus shared MiniSearch options)
- `src/pages/search.astro` (new)
- `src/pages/search/index.json.ts` (new; build-time serialized index endpoint)
- `src/pages/index.astro`
- `src/layouts/BaseLayout.astro`
- `src/components/SearchForm.astro` (new; reusable homepage/header form shell)
- `src/components/RecipeSearch.astro` (new; search form, filters, status, and compact result container)
- `src/styles/global.css`
- `src/scripts/search.ts` (new; search page behavior)
- `src/scripts/header-search.ts` (new; focus/Escape enhancement for native mobile disclosure)
- `tests/search.test.mjs` (new; Node built-in test runner, avoiding a test framework dependency)
- `scripts/verify-search-index.ts` (new; production artifact smoke check)
- `README.md`
- `PROJECT_PLAN.md` (mark Phase 3 complete after acceptance and record the implemented boundary)

## Reuse

- Reuse `getPublishedRecipes()` and `RecipeEntry` from `src/lib/recipes.ts` so draft/archived publication rules are not duplicated.
- Reuse `RecipeCard.astro` where server-rendered browse UI is needed; client-rendered search results should mirror its essential title, description, favorite, metadata, and link semantics without shipping an Astro/UI framework runtime.
- Reuse the metadata labels/formatting conventions in `src/components/RecipeMeta.astro` rather than inventing different result terminology.
- Reuse CSS tokens, focus treatment, fonts, and reduced-motion/dark-mode behavior from `src/styles/global.css` and `docs/BRAND.md`.
- Reuse collection IDs as MiniSearch IDs and canonical `/recipes/<id>/` URLs.
- Reuse Astro 7 static endpoint generation so the index is built from `getPublishedRecipes()` within Astro’s content context and appears at `/search/index.json` in development and production.
- Reuse MiniSearch 7.2.0’s serialized stored fields and wildcard query instead of creating a duplicate metadata artifact or custom “match all” mechanism.

## Steps

- [x] Limit simple filters to favorite, category, and tag; defer time-oriented querying to a future AI/API phase.
- [x] Use a large homepage form below the intro, centered desktop header search on content pages, and a top-right mobile search icon that expands a full-width row.
- [x] Omit header search from the homepage and `/search/` page because each has a prominent page-level form; use compact text results rather than full image cards.
- [x] Inspect recipe Markdown shape and select a line-oriented level-two ingredient-section extractor that supports the current canonical files without adding a Markdown-parser dependency.
- [x] Select an Astro static JSON endpoint for index generation so `getCollection()` is used in its supported build context and the normal `astro build` emits the artifact.
- [x] Define the compact normalized search-document/stored-field contract and shared index options in one module so serialization and deserialization cannot drift: index `title`, `aliases`, `tags`, `categories`, `ingredients`, `description`, and `body` with boosts `10/9/7/6/5/3/1`; store only URL, title, description, favorite, category/tag values, and card-style total-time/servings/difficulty display metadata.
- [x] Add exactly pinned `minisearch@7.2.0` (MIT, zero runtime dependencies, no install lifecycle script) by deliberately editing `package.json`, generating only the lockfile with lifecycle scripts disabled, performing a clean locked install with lifecycle scripts disabled, and inspecting provenance/tree/audit results during implementation.
- [x] Implement normalization for title, aliases, tags, categories, ingredients, description, and body, excluding unpublished recipes.
- [x] Implement the `/search/index.json` static endpoint with deterministic MiniSearch serialization, project-specified boosts, compact stored result/filter fields, JSON headers, and active-recipes-only assertions.
- [x] Build the semantic `/search/` shell and accessible plain-JavaScript behavior: lazy loading, loading/error/no-result states, all-term (`AND`) matching, prefix matching, 20%-edit-distance fuzzy matching only for terms longer than three characters, weighted ranking, a 20-result cap, and filters.
- [x] Apply favorite/category/tag filters with AND semantics between groups and OR semantics within a multi-select category or tag group; use MiniSearch’s wildcard query when filters are active without text (alphabetical order inherited from `getPublishedRecipes()`).
- [x] Add the homepage form and explicit `BaseLayout` control for content-page header search; use a three-column desktop header and native `<details>/<summary>` mobile disclosure, then enhance opening focus and Escape behavior without making disclosure depend on JavaScript.
- [x] Back search/filter state with `q`, `favorite`, repeated `category`, and repeated `tag` URL parameters; replace history during live edits and restore state/results on `popstate`.
- [x] Render result markup through safe DOM APIs (`textContent`/element attributes, not interpolated `innerHTML`) and include title link, optional favorite/description, taxonomy, and existing card-style metadata labels.
- [x] Style all search states responsively and consistently with the established brand, dark mode, focus behavior, reduced motion, and minimum target sizes.
- [x] Add focused tests for ingredient-section normalization and MiniSearch typo/prefix/ingredient ranking/filter behavior using Node’s built-in test runner and built-in TypeScript stripping; do not add a test framework.
- [x] Add a post-Astro-build verification script that restores `dist/search/index.json`, wildcard-enumerates stored results, checks every result’s corresponding generated recipe route, and fails on malformed/empty/inconsistent artifacts.
- [x] Update author/developer documentation and phase status with search behavior, query parameters, build artifact, commands, and deliberate exclusion of time filtering.

## Verification

Automated checks:

- Clean locked dependency install with lifecycle scripts disabled.
- `npm test` using Node’s built-in runner (no additional test dependency).
- `npm run build` for Astro content validation, endpoint/client generation, followed by the search-index smoke verifier.
- Production build and assertions that `dist/search/index.json` can be restored using the shared MiniSearch options and contains only active recipe IDs/stored metadata.
- Dependency audit after adding MiniSearch.

Manual checks:

- `chiken tikka` finds **Chicken Tikka Masala**.
- `garam masala` finds recipes containing that ingredient.
- Exact title, alias, tag, category, and prefix queries rank relevant recipes ahead of body-only matches.
- Favorite, category, and tag filters combine predictably, produce clear no-result states, and survive reload/back/forward navigation; no time filter is shown.
- Search works by keyboard and announces status changes without moving focus unexpectedly.
- On content-page mobile headers, the native search disclosure exposes a full-width row with accessible expanded state, focuses the input, closes with Escape, and does not consume vertical space while collapsed; homepage and `/search/` headers do not duplicate it.
- Loading, fetch failure, empty query, no matches, and malformed/missing artifact states are understandable.
- Phone, portrait/landscape tablet, desktop, light/dark mode, and reduced-motion presentation remain usable.
- With JavaScript disabled, recipes remain browsable from the homepage and direct recipe URLs, and `/search/` explains that interactive search requires JavaScript.
