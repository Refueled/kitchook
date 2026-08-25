# Kitchook

Kitchook is a self-hosted cookbook built from plain Markdown recipes. Recipe content remains the durable source of truth, while Astro produces a fully static site.

## Status

Phase 2's core interface is complete. Astro validates the collection, resolves and optimizes colocated images, generates active recipe routes, and presents them through a responsive cooking-first interface. The site uses semantic HTML and plain CSS, works without JavaScript, follows the operating system's light or dark preference, and includes ink-conscious recipe print styles.

Full-text search remains deferred to Phase 3. The current homepage intentionally presents one alphabetized all-recipes grid; favorites are marked on their cards rather than duplicated into a separate section.

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
npm run build    # Build the static site into dist/
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

List fields default to empty arrays. Unknown frontmatter fields and invalid metadata fail the build. Use conventional `## Ingredients`, `## Instructions`, `## Notes`, and optional subsection headings in the Markdown body; active recipes must have a non-empty body.

Put recipe images beside `recipe.md` and reference them by filename, for example `image: hero.jpg`. A referenced image must exist and be valid. Astro validates and optimizes it during the static build.

Only `active` recipes appear on the homepage or receive generated routes. `draft` and `archived` recipes remain validated canonical content but are not published.

## Repository layout

```text
recipes/                    Canonical, framework-independent recipe content
src/content.config.ts       Recipe loader and validation schema
src/lib/recipes.ts          Active-recipe publication query
src/components/             Server-rendered recipe cards and shared metadata
src/layouts/BaseLayout.astro Shared document shell and site chrome
src/pages/                  Astro pages and generated recipe route
src/styles/global.css        Responsive, dark-mode, and print presentation
docs/BRAND.md                Visual identity and color semantics
astro.config.mjs            Astro configuration
tsconfig.json               Strict TypeScript configuration
PROJECT_PLAN.md             Architecture and phased implementation roadmap
```
