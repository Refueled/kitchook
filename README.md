# Kitchook

Kitchook is a self-hosted cookbook built from plain Markdown recipes. Recipe content remains the durable source of truth, while Astro produces a fully static site.

## Status

Phases 0–3 are complete. Astro validates the collection, resolves and optimizes colocated images, generates active recipe routes, and presents them through a responsive cooking-first interface. The site uses semantic HTML and plain CSS, follows the operating system's light or dark preference, and includes ink-conscious recipe print styles.

Client-side MiniSearch search is available at `/search/`. It supports typo-tolerant, prefix-aware, weighted queries across recipe metadata, ingredients, and body text, plus favorite/category/tag filters. Recipe browsing and direct recipe pages continue to work without JavaScript.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the architecture and implementation roadmap and [docs/BRAND.md](docs/BRAND.md) for the durable visual identity guidelines.

## Prerequisites

- Node.js 24 LTS (recommended; Astro requires Node.js 22.12.0 or newer)
- npm 9.6.5 or newer

## Setup

Install the locked dependencies without running package lifecycle scripts:

```sh
npm ci --ignore-scripts
```

## Commands

```sh
npm run dev      # Start the local development server
npm test         # Run normalization, search, filter, and serialization tests
npm run build    # Build dist/ and verify the generated search artifact
npm run preview  # Preview the production build locally
```

## Authoring recipes

Each recipe is a self-contained package under the top-level `recipes/` directory:

```text
recipes/
└── chicken-tikka-masala/
    ├── recipe.md
    └── hero.jpg
```

The directory name must be a lowercase kebab-case slug. It is the stable recipe ID and generates `/recipes/chicken-tikka-masala/`; frontmatter cannot override it. Avoid renaming a published recipe directory.

`recipe.md` uses YAML frontmatter followed by ordinary Markdown. Only a non-blank `title` is required:

```md
---
title: Garlic Butter Pasta
---

## Ingredients

- 8 oz spaghetti

## Instructions

1. Cook the pasta.
```

Supported optional frontmatter fields are:

- `description`, `aliases`, `tags`, `categories`, `cuisine`, and `meal`
- `prep_minutes`, `cook_minutes`, and `total_minutes` (nonnegative integers)
- `servings` (a nonnegative integer or non-blank string)
- `difficulty` (`easy`, `medium`, or `hard`)
- `favorite` (defaults to `false`)
- `image`, resolved relative to `recipe.md`
- `source` with optional `name` and valid `url`
- `created` and `updated` dates
- `status` (`active`, `draft`, or `archived`; defaults to `active`)

List fields default to empty arrays. Unknown frontmatter fields and invalid metadata fail the build. Use conventional `## Ingredients`, `## Instructions`, `## Notes`, and optional subsection headings in the Markdown body; active recipes must have a non-empty body. Search gives ingredient text extra weight by extracting every level-two section whose heading ends in `Ingredients`, including `## Optional Ingredients`.

Put recipe images beside `recipe.md` and reference them by filename, for example `image: hero.jpg`. A referenced image must exist and be valid. Astro validates and optimizes it during the static build.

Only `active` recipes appear on the homepage, receive generated routes, or enter the search index. `draft` and `archived` recipes remain validated canonical content but are not published.

## Search

Astro generates the serialized MiniSearch artifact at `dist/search/index.json` (and `/search/index.json` in development) from the same alphabetized active-recipe query used by the site. The browser fetches it only after a query or filter is used. Search uses all-term matching, prefixes, and 20%-edit-distance fuzzy matching for terms longer than three characters, with a 20-result display cap.

Search state is shareable and restored during back/forward navigation:

- `q` — text query
- `favorite=true` — favorites only
- repeated `category` — OR within selected categories
- repeated `tag` — OR within selected tags

Favorite, category, and tag groups combine with AND semantics. Time is display metadata only; time querying/filtering is deliberately deferred to a future AI/API phase.

## Repository layout

```text
recipes/                    Canonical, framework-independent recipe content
src/content.config.ts       Recipe loader and validation schema
src/lib/recipes.ts          Active-recipe publication query
src/lib/search.ts           Shared normalization and MiniSearch contract
src/components/             Server-rendered recipe and search UI shells
src/scripts/                Plain TypeScript browser interactions
src/layouts/BaseLayout.astro Shared document shell and site chrome
src/pages/                  Astro pages, recipe routes, and search endpoint
scripts/                     Production artifact verification
tests/                       Node built-in search tests
src/styles/global.css        Responsive, dark-mode, and print presentation
docs/BRAND.md                Visual identity and color semantics
astro.config.mjs            Astro configuration
tsconfig.json               Strict TypeScript configuration
PROJECT_PLAN.md             Architecture and phased implementation roadmap
```
