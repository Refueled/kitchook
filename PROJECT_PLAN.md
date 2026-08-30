# Self-Hosted Markdown Cookbook — Project Plan & Implementation Handoff

> **Status:** Current implementation roadmap — Phases 0–6 complete
>
> **Last reviewed:** 2026-08-28
>
> **Primary audience:** Project owner + coding/automation agents
>
> **Purpose:** Define the architecture, content model, deployment strategy, implementation phases, and guardrails for a self-hosted cookbook whose long-term source of truth is plain Markdown in Git.

---

## 1. Executive Summary

Build a self-hosted cookbook where:

- **Recipes are plain Markdown files** with lightweight YAML frontmatter.
- **Images live beside their recipes** in the repository.
- **GitHub is the source of truth** and provides revision history, branches, pull requests, rollback, and backup.
- **Astro** converts the Markdown collection into a fully static website.
- **MiniSearch** provides client-side full-text, fuzzy, prefix, metadata-aware search without a server-side database.
- **Caddy** serves the generated static site from a Docker container on TrueNAS SCALE.
- **GitHub Actions** validates and builds the site after changes are merged to `main`.
- A **repository-scoped self-hosted GitHub Actions runner** on the home network performs only the final deployment step to TrueNAS.
- Production deployment uses **versioned release directories plus a `current` symlink**, so publishing is effectively atomic and does not require restarting the web container.
- The raw Markdown remains suitable for future AI/RAG/MCP integrations without making AI part of the initial website architecture.

The key architectural rule is:

> **The Markdown recipe collection is the durable product. The website, search index, Docker container, and future AI integrations are disposable views over that data.**

The project intentionally avoids a database, CMS, always-running application backend, authentication service, and other infrastructure until there is a demonstrated need for them.

---

## 2. Project Goals

### 2.1 Primary goals

1. Consolidate recipes currently scattered across browsers, bookmarks, Pinterest, notes, devices, and other sources.
2. Store each recipe in a human-readable and machine-readable format.
3. Preserve the recipe collection in Git for:
   - revision history;
   - rollback;
   - change review;
   - off-server backup;
   - future automation.
4. Make the cookbook extremely fast and easy to use from:
   - phones;
   - tablets;
   - laptops;
   - kitchen-mounted displays.
5. Support search that is:
   - instant;
   - fuzzy;
   - typo tolerant;
   - prefix aware;
   - capable of searching ingredients, tags, titles, and recipe text.
6. Make adding a recipe as close as possible to:
   1. create/edit Markdown;
   2. commit;
   3. push/merge;
   4. production updates automatically.
7. Keep the production runtime extremely small and easy to recover.
8. Preserve a clean path toward future capabilities such as:
   - AI recipe recommendations;
   - pantry matching;
   - meal planning;
   - MCP/API access;
   - natural-language recipe querying;
   - voice/kitchen assistant interfaces.

### 2.2 Secondary goals

- Good mobile ergonomics.
- Printable recipe pages.
- Dark-mode support.
- Favorites.
- Tags and categories.
- Recipe source attribution.
- Optional nutrition metadata later.
- Optional ingredient normalization later.
- Offline/PWA support later if it proves useful.

---

## 3. Explicit Non-Goals for Version 1

Do **not** add these unless a real requirement appears:

- SQL database.
- NoSQL database.
- Redis.
- Elasticsearch/OpenSearch.
- Server-side search service.
- User accounts.
- Multi-user permissions.
- Web-based recipe editor.
- Full CMS.
- Kubernetes.
- Microservices.
- Background worker queues.
- Runtime Node.js application server.
- Runtime Python application server.
- AI chatbot.
- Vector database.
- Embeddings pipeline.
- Pantry inventory database.
- Shopping-list synchronization.
- Nutrition API integration.

A major project risk is accidentally turning a personal cookbook into a generic recipe-management SaaS application. Avoid that.

---

# 4. Core Architectural Principles

## 4.1 Markdown is canonical

A recipe must remain useful if all project software disappears.

A valid recipe should still be understandable when opened directly in:

- GitHub;
- VS Code;
- Obsidian;
- a terminal;
- any Markdown editor;
- an AI coding agent;
- a future parser not yet written.

Do not store essential recipe data only in generated HTML, JavaScript state, a database, or framework-specific file format.

## 4.2 Frontmatter should enrich Markdown, not replace it

Structured metadata belongs in YAML frontmatter.

The actual recipe remains normal Markdown.

Prefer:

```markdown
---
title: Chicken Tikka Masala
tags:
  - chicken
  - curry
---

## Ingredients

- 2 lb chicken thighs
```

Avoid turning the entire recipe into a giant YAML or JSON document.

## 4.3 Production should be disposable

Nothing important should exist only inside the running Docker container.

A production rebuild should require only:

1. the Git repository;
2. Node/npm for the build;
3. the static web server.

## 4.4 Prefer build-time work over runtime work

If something can be calculated when the site is built, do it then.

Examples:

- page generation;
- recipe metadata validation;
- search index construction;
- tag indexes;
- recipe counts;
- image metadata;
- normalized search documents;
- machine-readable JSON exports.

Production should mostly serve files.

## 4.5 Avoid unnecessary coupling

Caddy should not know how recipes are authored.

Astro should not need to know how TrueNAS works.

Recipes should not depend on Astro-specific syntax unless there is a compelling reason.

Search should consume normalized recipe data rather than reaching deeply into rendering components.

Deployment should treat the output directory as an opaque static artifact.

---

# 5. High-Level Architecture

```text
                         AUTHORING
              ┌──────────────────────────┐
              │ Markdown + Images        │
              │ Local editor / GitHub    │
              └────────────┬─────────────┘
                           │
                        git push
                           │
                           ▼
              ┌──────────────────────────┐
              │ Private GitHub Repo      │
              │ source of truth          │
              └────────────┬─────────────┘
                           │
                     merge to main
                           │
                           ▼
              ┌──────────────────────────┐
              │ GitHub Actions           │
              │ GitHub-hosted runner     │
              │                          │
              │ lint / validate          │
              │ test                     │
              │ Astro build              │
              │ build search index       │
              └────────────┬─────────────┘
                           │
                    static artifact
                           │
                           ▼
              ┌──────────────────────────┐
              │ Deployment Job           │
              │ self-hosted runner       │
              │ repository-scoped        │
              └────────────┬─────────────┘
                           │
                  write new release
                           │
                           ▼
        TrueNAS SCALE
┌──────────────────────────────────────────────────┐
│                                                  │
│ /mnt/.../cookbook/site/                          │
│                                                  │
│   releases/                                      │
│      <git-sha-1>/                                 │
│      <git-sha-2>/                                 │
│      <git-sha-3>/                                 │
│                                                  │
│   current -> releases/<git-sha-3>                │
│                                                  │
│             ▲                                    │
│             │ read-only                          │
│             │                                    │
│       ┌─────────────┐                            │
│       │ Caddy       │                            │
│       │ container   │                            │
│       └──────┬──────┘                            │
│              │                                   │
└──────────────┼───────────────────────────────────┘
               │
         HTTP / HTTPS
               │
        phone / tablet / PC
```

---

# 6. Technology Decisions

## 6.1 Source control: GitHub

Use a **private GitHub repository**.

Benefits:

- revision control;
- issue tracking if desired;
- pull requests;
- branch protection;
- GitHub Actions;
- convenient remote backup;
- easy future Codex/agent interaction.

Suggested repository name:

```text
cookbook
```

or:

```text
home-cookbook
```

Keep naming generic. The repository should remain valid even if the rendered website is replaced later.

---

## 6.2 Static site generator: Astro

Use Astro as the website build system.

Reasons:

- first-class Markdown support;
- content collections fit recipe data naturally;
- frontmatter schemas can be validated;
- static output is the normal use case;
- little or no client-side JavaScript is required except where desired;
- easy componentization without making recipes framework-dependent;
- good image tooling is available if useful later.

The project should use **static output only**.

Do not introduce Astro SSR/server adapters for Version 1.

### Content collection role

Astro should treat all recipes as one content collection.

The collection schema should:

- require a title;
- validate metadata types;
- provide safe defaults;
- keep most fields optional;
- fail the build for malformed data where failure is preferable to silently publishing broken content.

---

## 6.3 Search: MiniSearch

Use MiniSearch for the initial search implementation.

Reasons:

- runs entirely in the browser;
- no search server;
- no database;
- supports:
  - fuzzy search;
  - prefix search;
  - ranking;
  - field boosting;
  - filtering;
  - suggestions;
- index can be serialized during build and loaded by the browser.

### Search architecture

Do **not** rebuild the entire index from raw recipe content on every browser page load.

Preferred pipeline:

```text
Markdown
   │
   ▼
Astro content collection
   │
   ├── static recipe HTML
   │
   ├── normalized recipe metadata
   │
   └── MiniSearch index
              │
              ▼
      search-index.json
```

The browser loads the serialized index only when search is used or when the search component becomes active.

### Initial indexed fields

Index:

- title;
- aliases;
- tags;
- categories;
- ingredients;
- description;
- recipe body.

Suggested relative weighting:

| Field | Suggested weight |
|---|---:|
| title | 10 |
| aliases | 9 |
| tags | 7 |
| categories | 6 |
| ingredients | 5 |
| description | 3 |
| body | 1 |

Tune after real recipes exist.

### Search behavior

Recommended initial behavior:

- exact matches;
- prefix matches;
- fuzzy matching for terms longer than 3 characters;
- case-insensitive matching;
- result limit of approximately 20;
- title/tag/ingredient hits ranked above arbitrary body-text matches.

Example intended behavior:

```text
chiken parm
```

should still find:

```text
Chicken Parmesan
```

---

## 6.4 Production web server: Caddy

Use Caddy as the static web server.

Caddy's job should be only:

- serve static files;
- compression;
- cache headers where appropriate;
- optional TLS/reverse-proxy integration.

No recipes should be stored inside a long-lived writable container layer.

The static site directory should be bind-mounted read-only.

---

## 6.5 Production host: TrueNAS SCALE

Use TrueNAS SCALE's Docker/Custom App support.

The application itself is a trivial container:

```text
Caddy
  +
read-only mounted static site
```

TrueNAS supports custom applications using Docker Compose YAML, which fits this architecture well.

The web container should **not need to be recreated when recipes change**.

Only the files under the mounted site directory change.

---

# 7. Repository Layout

Recommended starting structure:

```text
cookbook/
├── .github/
│   └── workflows/
│       ├── validate.yml
│       └── deploy.yml
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── RECIPE_SCHEMA.md
│   └── IMPORTING_RECIPES.md
│
├── recipes/
│   ├── chicken-tikka-masala/
│   │   ├── recipe.md
│   │   └── hero.jpg
│   │
│   ├── beef-stew/
│   │   ├── recipe.md
│   │   └── hero.webp
│   │
│   └── chocolate-chip-cookies/
│       ├── recipe.md
│       └── hero.jpg
│
├── scripts/
│   ├── build-search-index.ts
│   ├── export-recipes.ts
│   └── validate-recipes.ts
│
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── RecipeCard.astro
│   │   ├── RecipeMetadata.astro
│   │   ├── RecipeSearch.astro
│   │   └── TagList.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── RecipeLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro
│   │   ├── search.astro
│   │   ├── recipes/
│   │   │   └── [...slug].astro
│   │   ├── tags/
│   │   │   └── [...tag].astro
│   │   └── api/
│   │       └── recipes.json.ts
│   │
│   ├── styles/
│   │   └── global.css
│   │
│   ├── content.config.ts
│   └── lib/
│       ├── recipe.ts
│       ├── search.ts
│       └── slug.ts
│
├── public/
│   ├── favicon.svg
│   └── icons/
│
├── infrastructure/
│   ├── Caddyfile
│   ├── compose.yml
│   └── README.md
│
├── tests/
│   └── fixtures/
│
├── astro.config.mjs
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
└── PROJECT_PLAN.md
```

## Important implementation note

The exact mechanics used to load `recipes/` into Astro may depend on the chosen Astro content collection loader/version.

**Do not move the canonical recipe files into a framework-specific layout merely because a tutorial assumes `src/content`.**

If Astro can load the top-level `recipes/` directory cleanly using its current content collection loader, prefer that.

The desired separation is:

```text
recipes/     durable content
src/         website implementation
```

This makes it obvious which files survive a future framework replacement.

---

# 8. Recipe Storage Convention

Each recipe gets its own directory:

```text
recipes/
└── chicken-tikka-masala/
    ├── recipe.md
    ├── hero.jpg
    ├── step-1.jpg
    └── step-2.jpg
```

Benefits:

- portable;
- images stay associated with the recipe;
- no giant global image directory;
- easy import/export;
- friendly to Git;
- future automation can treat each directory as one recipe package.

Directory names should be stable slugs.

Examples:

```text
chicken-tikka-masala
grandmas-mac-and-cheese
beef-bourguignon
weeknight-tacos
```

Do not rename recipe directories casually after publishing because the directory name may become part of the permanent URL.

---

# 9. Recipe Markdown Schema

## 9.1 Design rules

The schema should be **structured enough to support automation** but **permissive enough that adding a recipe is never annoying**.

Version 1 should require only:

```yaml
title
```

Everything else should be optional or defaultable.

A recipe copied from an old index card should still be publishable without spending 15 minutes entering metadata.

---

## 9.2 Recommended frontmatter

```yaml
---
title: Chicken Tikka Masala

description: Creamy tomato-based chicken curry.

aliases:
  - Chicken Tikka
  - Tikka Masala

tags:
  - indian
  - curry
  - chicken

categories:
  - dinner

cuisine:
  - indian

meal:
  - dinner

prep_minutes: 20
cook_minutes: 35
total_minutes: 55

servings: 4

difficulty: easy

favorite: true

image: hero.jpg

source:
  name: Example Recipe Site
  url: https://example.com/chicken-tikka-masala

created: 2026-08-24
updated: 2026-08-24

status: active
---
```

---

## 9.3 Field definitions

### `title`

```yaml
title: Chicken Tikka Masala
```

- required;
- string;
- human-facing recipe name.

### `description`

```yaml
description: Creamy tomato-based chicken curry.
```

- optional;
- short summary;
- useful for search results/cards.

### `aliases`

```yaml
aliases:
  - Chicken Tikka
  - Tikka
```

- optional;
- alternate names;
- useful for search.

### `tags`

```yaml
tags:
  - chicken
  - spicy
  - weeknight
  - comfort-food
```

- optional;
- free-form searchable descriptors.

### `categories`

```yaml
categories:
  - dinner
```

Useful broad taxonomy.

Suggested controlled-ish values:

- breakfast;
- lunch;
- dinner;
- dessert;
- snack;
- appetizer;
- side;
- drink;
- sauce;
- bread.

Do not enforce this too rigidly initially.

### `cuisine`

```yaml
cuisine:
  - indian
```

Optional.

### `meal`

May overlap with categories and can potentially be removed after real usage reveals whether both are useful.

Do not over-model before data exists.

### Time fields

```yaml
prep_minutes: 20
cook_minutes: 35
total_minutes: 55
```

All optional integers.

`total_minutes` may be explicitly supplied because some recipes include resting/marinating time that is not simply prep + cook.

### `servings`

Initial recommendation:

```yaml
servings: 4
```

Allow integer or simple string later if needed:

```yaml
servings: "8 cookies"
```

The implementation should avoid making serving data unnecessarily strict.

### `difficulty`

```yaml
difficulty: easy
```

Suggested:

- easy;
- medium;
- hard.

Optional.

### `favorite`

```yaml
favorite: true
```

Optional boolean, default `false`.

### `image`

```yaml
image: hero.jpg
```

Relative to the recipe directory.

### `source`

```yaml
source:
  name: Serious Eats
  url: https://example.com/original
```

Source information is important when importing recipes from external sites.

Preserve attribution even after modifying the recipe.

### Dates

```yaml
created: 2026-08-24
updated: 2026-08-24
```

Optional.

Git already preserves actual history. These dates are only for human-facing metadata where useful.

### `status`

```yaml
status: active
```

Potential values:

- `active`
- `draft`
- `archived`

Use `draft` to keep an incomplete recipe in Git without publishing it.

---

# 10. Markdown Body Convention

Recommended recipe body:

```markdown
## Ingredients

### Chicken

- 2 lb boneless skinless chicken thighs
- 1 cup plain yogurt
- 4 cloves garlic, minced

### Sauce

- 1 can crushed tomatoes
- 1 cup heavy cream
- 2 tsp garam masala

## Instructions

1. Combine the chicken, yogurt, garlic, and spices.
2. Marinate for at least 30 minutes.
3. Brown the chicken.
4. Add tomatoes and simmer.
5. Stir in cream and finish cooking.

## Notes

- Better the next day.
- Reduce cayenne when cooking for spice-sensitive guests.

## Variations

- Substitute coconut milk for cream.
```

### Standard section names

Encourage but do not absolutely require:

- `## Ingredients`
- `## Instructions`
- `## Notes`
- `## Variations`

The first two should ideally be present for complete recipes.

### Ingredient representation

Version 1 ingredients remain simple Markdown list items.

Do **not** prematurely invent a complex ingredient object schema.

Prefer:

```markdown
- 2 tbsp olive oil
- 1 medium onion, diced
```

over:

```yaml
ingredients:
  - quantity: 2
    unit: tablespoon
    ingredient_id: olive_oil
```

Structured ingredient parsing can be added later if pantry matching actually requires it.

---

# 11. Example Complete Recipe

```markdown
---
title: Chicken Tikka Masala
description: Creamy tomato-based chicken curry that's good for weeknights.
aliases:
  - Chicken Tikka
tags:
  - chicken
  - curry
  - weeknight
categories:
  - dinner
cuisine:
  - indian
prep_minutes: 20
cook_minutes: 35
total_minutes: 55
servings: 4
difficulty: easy
favorite: true
image: hero.jpg
source:
  name: Original source
  url: https://example.com/original
status: active
---

## Ingredients

### Chicken

- 2 lb boneless skinless chicken thighs, cut into pieces
- 1 cup plain yogurt
- 4 cloves garlic, minced
- 1 tbsp grated ginger
- 2 tsp garam masala

### Sauce

- 1 can crushed tomatoes
- 1 cup heavy cream
- 1 onion, diced
- 1 tbsp butter
- Salt to taste

## Instructions

1. Mix the chicken with yogurt, garlic, ginger, and garam masala.
2. Marinate for at least 30 minutes.
3. Brown the chicken in batches.
4. Cook the onion until soft.
5. Add tomatoes and simmer for 15 minutes.
6. Return chicken to the pan and cook through.
7. Stir in cream and butter.
8. Adjust seasoning and serve.

## Notes

- Serve with basmati rice or naan.
- Reheats extremely well.
```

---

# 12. Astro Content Schema

The implementation agent should create a Zod-backed schema matching the frontmatter.

Illustrative shape only:

```ts
const recipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),

  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  cuisine: z.array(z.string()).default([]),
  meal: z.array(z.string()).default([]),

  prep_minutes: z.number().int().nonnegative().optional(),
  cook_minutes: z.number().int().nonnegative().optional(),
  total_minutes: z.number().int().nonnegative().optional(),

  servings: z.union([z.number(), z.string()]).optional(),

  difficulty: z.enum(["easy", "medium", "hard"]).optional(),

  favorite: z.boolean().default(false),

  image: z.string().optional(),

  source: z.object({
    name: z.string().optional(),
    url: z.string().url().optional(),
  }).optional(),

  created: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),

  status: z.enum(["active", "draft", "archived"]).default("active"),
})
```

The coding agent should adapt this to the **current Astro API**, not blindly copy an old `src/content/config.ts` tutorial.

---

# 13. URL Design

Prefer stable, boring routes.

Recipe:

```text
/recipes/chicken-tikka-masala/
```

Search:

```text
/search/
```

Tags:

```text
/tags/chicken/
/tags/weeknight/
```

Optional categories:

```text
/categories/dinner/
```

Home:

```text
/
```

Avoid date-based URLs.

Recipes are not blog posts.

---

# 14. Site Pages

## 14.1 Home page

Initial homepage should contain:

- large search box;
- favorites;
- recently added recipes;
- common categories/tags;
- optional random recipe button.

The homepage should prioritize **finding food**, not explaining the project.

Potential layout:

```text
┌──────────────────────────────────┐
│ Cookbook                         │
│                                  │
│ [ Search recipes...            ] │
│                                  │
│ Favorites                        │
│ [card] [card] [card]             │
│                                  │
│ Browse                           │
│ Dinner  Chicken  Pasta  Quick    │
│                                  │
│ Recently Added                   │
│ [card] [card] [card]             │
└──────────────────────────────────┘
```

---

## 14.2 Recipe page

Recipe pages should optimize for someone actively cooking.

Above the fold:

```text
Chicken Tikka Masala

55 min    4 servings    Easy

[ image ]

Ingredients
...
```

Important kitchen UX:

- readable font;
- high contrast;
- generous line spacing;
- large tap targets;
- no tiny metadata;
- no distracting animation;
- no sticky overlays covering recipe text;
- minimal navigation chrome;
- screen should remain usable in portrait tablet mode.

Potential future kitchen mode:

```text
[ Keep screen awake ]
[ Increase text size ]
[ Hide images ]
```

Do not implement until basic usability is complete.

---

## 14.3 Search page

Search should feel immediate.

Suggested design:

```text
Search recipes
┌─────────────────────────────────┐
│ chiken parm                     │
└─────────────────────────────────┘

Filters:
[ Dinner ] [ < 30 min ] [ Favorite ]

Chicken Parmesan
Chicken Parm Sandwiches
...
```

Version 1 filters:

- favorite;
- category;
- tags;
- optionally max total time.

Do not build a complicated advanced-search syntax initially.

---

# 15. Search Document Model

At build time, normalize every active recipe into a structure similar to:

```json
{
  "id": "chicken-tikka-masala",
  "url": "/recipes/chicken-tikka-masala/",
  "title": "Chicken Tikka Masala",
  "aliases": "Chicken Tikka",
  "tags": "chicken curry weeknight",
  "categories": "dinner",
  "ingredients": "chicken thighs yogurt garlic ginger garam masala crushed tomatoes heavy cream",
  "description": "Creamy tomato-based chicken curry",
  "body": "Ingredients ... Instructions ...",
  "favorite": true,
  "totalMinutes": 55
}
```

Flatten arrays into searchable text where convenient.

Store only result-display fields needed in the browser.

Avoid sending unnecessary raw content in the search index.

---

# 16. Search Build Strategy

Preferred build:

```text
npm run build
    │
    ├── astro build
    │
    ├── normalize active recipes
    │
    ├── create MiniSearch index
    │
    ├── JSON.stringify(index)
    │
    └── place artifact in dist/search/
```

Potential output:

```text
dist/
├── index.html
├── recipes/
├── tags/
├── api/
│   └── recipes.json
└── search/
    ├── index.json
    └── metadata.json
```

MiniSearch supports serializing an index and later loading it again, which is preferred to reconstructing the full index on every client.

---

# 17. Machine-Readable Recipe Export

Generate a static normalized API-like artifact:

```text
/api/recipes.json
```

This is **not a live API**.

It is a generated JSON file.

Example:

```json
[
  {
    "slug": "chicken-tikka-masala",
    "title": "Chicken Tikka Masala",
    "tags": ["chicken", "curry", "weeknight"],
    "ingredients": [
      "2 lb boneless skinless chicken thighs",
      "1 cup plain yogurt"
    ],
    "url": "/recipes/chicken-tikka-masala/"
  }
]
```

Benefits:

- future apps can consume cookbook data;
- future AI tools have normalized data;
- scripts do not need to scrape HTML;
- external integrations do not need access to Astro internals.

This export should be generated from the same canonical Markdown content.

---

# 18. CSS / Front-End Philosophy

Keep the browser payload small.

The durable visual identity is documented in [`docs/BRAND.md`](docs/BRAND.md). Phase 2 established a high-contrast neobrutalist interface, the `KitchooK!` wordmark, the coral emphasis color, and self-hosted variable display fonts; later UI work should preserve those decisions unless the brand document is deliberately revised.

Use:

- semantic HTML;
- plain CSS or minimally processed CSS;
- Astro components;
- self-hosted fonts with system fallbacks;
- small purpose-built JavaScript modules only where interaction requires them.

Avoid by default:

- React;
- Vue;
- Svelte;
- giant component libraries;
- client-side routing;
- SPA architecture.

If an interactive island becomes genuinely useful, Astro supports adding one later.

The entire site should remain usable even if search JavaScript fails.

---

# 19. Accessibility Requirements

Version 1 should include:

- semantic headings;
- keyboard-accessible search;
- visible focus states;
- sufficient contrast;
- alt text support for recipe images;
- proper labels;
- buttons with real button semantics;
- scalable text;
- no critical interaction requiring hover.

Kitchen use naturally overlaps with accessibility: large targets and readable text help everyone.

---

# 20. Responsive Design Requirements

Primary breakpoints are conceptual, not framework-specific:

### Phone

- single-column;
- large search box;
- recipe cards full width;
- recipe content comfortable one-handed.

### Tablet

Primary kitchen target.

- wider recipe measure;
- potential two-column ingredient/instruction layout only when readable;
- large controls;
- landscape and portrait support.

### Desktop

- content width should remain constrained;
- do not stretch paragraphs across an ultrawide display.

---

# 21. Images

Store images inside each recipe directory.

Initial recommendations:

- prefer JPEG/WebP for photographs;
- avoid committing enormous camera originals;
- approximately 1600–2400 px maximum long edge is more than enough for this use;
- image optimization may be performed at build time;
- preserve the original only if there is a real reason.

Do not add Git LFS initially.

Revisit Git LFS only if repository size becomes a real issue.

---

# 22. Recipe Import Workflow

A major future productivity feature is **recipe ingestion**, but it should be implemented separately from the core site.

Version 1 manual workflow:

```text
Find recipe
   │
   ▼
Create recipes/<slug>/
   │
   ├── recipe.md
   └── hero image if desired
   │
   ▼
Normalize formatting
   │
   ▼
git commit
   │
   ▼
git push
```

Potential Version 2 helper:

```text
npm run new-recipe
```

which prompts for:

- title;
- source URL;
- optional category;

then scaffolds:

```text
recipes/<slug>/recipe.md
```

Potential later AI importer:

```text
recipe-import <url>
```

could:

1. fetch a source;
2. extract recipe content;
3. convert it to the house Markdown format;
4. preserve attribution;
5. save as draft;
6. require human review before committing.

AI import should never become the canonical storage format.

---

# 23. Git Workflow

For a personal project, keep Git boring.

Recommended:

```text
main
```

is always production-ready.

Normal small recipe edit:

```text
edit
git add
git commit
git push
```

For larger site features:

```text
feature branch
      │
      ▼
pull request
      │
      ▼
CI validation
      │
      ▼
merge main
      │
      ▼
automatic production deploy
```

Branch protection is optional initially but recommended before the deployment runner is trusted with automatic production publishing.

---

# 24. CI/CD Design

Use two conceptual stages:

```text
BUILD
GitHub-hosted runner

DEPLOY
repository-scoped self-hosted runner
```

This separation is intentional.

The TrueNAS-side runner should not need Node, npm, Astro, or arbitrary build dependencies.

---

# 25. CI Stage — GitHub-Hosted Runner

Trigger:

- pull requests;
- pushes to `main`.

PR workflow:

```text
checkout
npm ci --ignore-scripts
validate recipes
lint
tests
npm run build
```

No deployment.

Main workflow:

```text
checkout
npm ci --ignore-scripts
validate recipes
test
npm run build
upload dist artifact
```

Advantages:

- clean disposable environment;
- reproducible build;
- broken Markdown/frontmatter cannot silently reach production;
- TrueNAS does not perform untrusted package installation.

---

# 26. Deployment Stage — Self-Hosted Runner

Phase 7 implements deployment as a dependent job in the existing unified workflow. Only a successful push-to-`main` build schedules `[self-hosted, kitchook-deploy]`; pull requests never target local infrastructure. The job waits in a non-canceling production concurrency group, queries GitHub's read-only refs API after acquiring the runner, and exits successfully without deployment if its SHA is no longer the `main` head.

A commit-SHA-pinned `actions/download-artifact` downloads the same run's named `site` artifact into ephemeral runner storage. The deployment job does not check out source, rebuild, or install dependencies. Repository-owned helpers installed read-only on the host then:

```text
validate artifact and full-SHA release ID
publish or safely recover the matching immutable managed release
atomically select current
compare homepage, search JSON, and recipe API bytes through the LAN origin
restore and verify the prior selection on failure
prune only explicitly managed history after success
```

Production remains `site/releases/<full-commit-sha>` plus a relative `current` symlink. Release ownership/order and interrupted-operation markers live under `site/.kitchook-deploy/`, outside immutable content. A matching managed retry is accepted; unmanaged, partial without an ownership marker, or byte-mismatched collisions fail closed.

Benefits:

- deploy is effectively atomic and stale builds cannot roll production backward;
- rollback is immediate and uses the same validated selector;
- no Caddy restart or image rebuild occurs;
- production state maps directly to a full Git revision; and
- retention never guesses whether an unknown directory belongs to automation.

---

# 27. Atomic Deployment Pattern

Pseudo-shell:

```bash
set -euo pipefail

SHA="${GITHUB_SHA}"
ROOT="/srv/cookbook-site"
RELEASE="$ROOT/releases/$SHA"

mkdir -p "$RELEASE"

tar -xf site.tar.gz -C "$RELEASE"

test -f "$RELEASE/index.html"

ln -sfn "releases/$SHA" "$ROOT/current.new"
mv -Tf "$ROOT/current.new" "$ROOT/current"
```

Then clean old releases.

Exact commands should be validated for the filesystem/environment used by TrueNAS.

The principle is more important than the literal shell snippet.

---

# 28. Rollback

Rollback should not require a rebuild.

Example:

```text
current -> releases/c813ef0
```

Bad deploy discovered.

Change:

```text
current -> releases/bd193ca
```

Caddy immediately serves the previous version.

An optional future workflow can expose manual rollback through GitHub Actions.

Version 1 can simply document the command.

---

# 29. TrueNAS Dataset Layout

Phase 6 implements this Host Path layout:

```text
/mnt/<pool>/apps/kitchook/
├── site/
│   ├── releases/
│   │   └── <commit-sha>/
│   └── current -> releases/<commit-sha>
└── config/
    └── Caddyfile
```

The exact pool/dataset path is selected during live setup. It must be a dedicated dataset outside hidden `ix-apps` management and must not also be an SMB/NFS share. Caddy user `568:568` receives read/traverse access to config and site. The Phase 7 runner is a separate app using official-image UID/GID `1001:1001`; it receives Modify only on `site/` and a separate runner-state Host Path, plus Read on a root-owned operations Host Path. It cannot mount or write Caddy configuration, the parent apps dataset, or unrelated NAS paths. The selected Phase 6 baseline is explicitly adopted into `.kitchook-deploy/releases`; unmanaged acceptance/test directories are classified and removed manually after migration acceptance.

---

# 30. Caddy Configuration

The implemented [`infrastructure/Caddyfile`](infrastructure/Caddyfile) is explicitly HTTP-only on `:8080`, disables the admin API, persisted dynamic configuration, and automatic HTTPS, and serves `/srv/current` with the ordinary static file server. It enables zstd/gzip, emits access logs to stdout, returns real 404s, and does not enable directory browsing or an SPA fallback.

All responses receive conservative security headers. Ordinary HTML, JSON, fonts, and other non-hashed paths use `Cache-Control: no-cache` so clients revalidate; only `/_astro/*` receives `public, max-age=31536000, immutable`. HSTS is intentionally absent because the Phase 6 origin is LAN HTTP.

The live origin remains HTTP-only; remote TLS and authentication terminate at Cloudflare. A self-hosted Cloudflare Access application restricts the hostname to approved identities, and anonymous requests redirect to Access login rather than origin content.

---

# 31. Docker Compose / TrueNAS Custom App

The implemented [`infrastructure/compose.yml`](infrastructure/compose.yml) is installed through TrueNAS 25.04 **Install via YAML** after replacing the dataset path and selected host port. It uses the digest-pinned Caddy 2.11.4 Alpine image, bridge-publishes one operator-selected host port to container port 8080, and bind-mounts only `<dataset>/site` and `<dataset>/config/Caddyfile`, both read-only.

Security/runtime properties:

- numeric non-root `568:568`, every capability dropped, no-new-privileges, and read-only root filesystem;
- bounded `/data` and `/config` tmpfs mounts rather than image-declared anonymous volumes;
- bounded health check, CPU, memory, PIDs, shutdown grace, and container logs;
- no Docker socket, privileged mode, host networking, source/recipe mount, secret, or unrelated NAS path; and
- restart behavior and container replacement are independent from release files.

The startup copy of the Caddy executable into `/config` tmpfs is deliberate: it strips the official binary's unused low-port file capability so the binary can execute with a zeroed capability bounding set while the service listens on 8080.

Phase 7 adds a **separate** TrueNAS Custom App from [`infrastructure/runner/compose.yml`](infrastructure/runner/compose.yml). It wraps GitHub's version-and-digest-pinned public official runner image without building a project image or publishing a registry artifact. The app exposes no port and mounts only persistent runner state, read-only operations, and writable `site/`; `_work` and `/tmp` are bounded tmpfs.

---

# 32. Self-Hosted Runner Security

This deserves deliberate treatment.

A self-hosted GitHub runner executes workflow commands on local infrastructure.

For this project:

1. Use a **private repository**.
2. Make the runner **repository-scoped**.
3. Do not share the runner with unrelated repositories.
4. Do not expose the Docker socket.
5. Do not run the runner privileged.
6. Do not run the runner as root if avoidable.
7. Give it write access only to the cookbook deployment dataset.
8. Do not mount:
   - home directories;
   - SSH key directories;
   - media datasets;
   - backups;
   - secrets unrelated to deployment.
9. Allow outbound HTTPS to GitHub.
10. Avoid broad LAN credentials.
11. Protect who can modify deployment workflows.
12. Consider GitHub environment protections if additional collaborators are later added.

For a single-owner private repository, the risk is manageable, but the runner should still be treated as a code-execution boundary.

The implemented boundary uses a repository registration token only on first startup. The entrypoint unsets it before starting `Runner.Listener`, and the operator must remove it from the TrueNAS app definition immediately after registration. Persistent state permits GitHub's default automatic runner updates without a runtime PAT; downloaded actions, artifacts, and workspaces are discarded with tmpfs. The container runs numeric `1001:1001` with a read-only root, all capabilities dropped, no-new-privileges, no supplementary sudo/docker groups, no Docker socket, no inbound port, and no source mount. The official image's bundled `sudo` and Docker CLI therefore provide no elevation or host daemon access.

---

# 33. Why Not Give GitHub SSH Access to TrueNAS?

It is possible to have a GitHub-hosted runner SSH directly into a server.

However, that generally requires either:

- exposing SSH publicly;
- maintaining firewall/IP rules;
- creating VPN connectivity;
- adding another network tunnel.

The self-hosted deployment runner reverses the connection model:

```text
TrueNAS-side runner
        │
        └──── outbound HTTPS ────► GitHub
```

GitHub does not need to initiate a connection into the home network.

That is operationally attractive for a homelab.

---

# 34. Why Not Rebuild a Docker Image for Every Recipe?

That is a valid architecture:

```text
Markdown change
     │
     ▼
build Docker image
     │
     ▼
push GHCR
     │
     ▼
pull on TrueNAS
     │
     ▼
replace container
```

It is not the preferred architecture here because recipe changes affect **content**, not application runtime.

Rebuilding/restarting a container merely to replace static HTML is unnecessary.

A container-image deployment may become useful if the production application gains a real runtime backend later.

---

# 35. Why No Database?

The site initially has one authoritative dataset:

```text
Markdown recipe files
```

A database would duplicate that state.

Search does not require a database at this scale.

Static generation handles:

- route creation;
- taxonomy pages;
- metadata.

MiniSearch handles:

- fuzzy full-text search;
- ranking;
- filters.

A database should only be introduced when there is truly mutable runtime state, such as:

- pantry inventory;
- shared shopping lists;
- per-user preferences;
- cooking history;
- web-based editing;
- accounts.

If that day comes, the recipe Markdown can remain canonical while the new database stores only runtime state.

---

# 36. Build Validation

A bad recipe should fail before deployment when possible.

Validate:

- frontmatter parses;
- required title exists;
- status is valid;
- source URL is valid when present;
- image reference exists when specified;
- duplicate slugs do not exist;
- duplicate canonical titles optionally warn;
- time values are nonnegative;
- recipe body is not empty for `active` recipes.

Warnings rather than errors:

- no image;
- no tags;
- no source;
- no time;
- no servings.

The schema should encourage useful metadata without punishing quick recipe capture.

---

# 37. Testing Strategy

Keep tests proportional to the project.

## Unit tests

Useful targets:

- slug normalization;
- recipe normalization;
- search-document creation;
- filter logic;
- time formatting.

## Build tests

CI must prove:

```bash
npm ci --ignore-scripts
npm test
npm run build
```

works from a clean checkout.

## Content fixture tests

Include a few fixture recipes demonstrating:

- minimal recipe;
- fully populated recipe;
- recipe without image;
- draft recipe;
- recipe with aliases;
- invalid frontmatter.

## End-to-end testing

Optional initially.

If introduced later, Playwright can verify:

- homepage renders;
- search finds expected recipe;
- recipe route works;
- draft recipe is not published.

Do not introduce a large test framework before the first usable site exists.

---

# 38. Logging / Observability

Version 1 needs very little.

Relevant failure points:

- GitHub Actions validation failure;
- build failure;
- deployment failure;
- Caddy unavailable.

GitHub Actions logs provide build/deploy history.

Caddy standard logs are sufficient for runtime diagnosis.

Do not add:

- Prometheus;
- Grafana;
- Loki;
- telemetry stack;

unless this becomes useful beyond curiosity.

---

# 39. Backups

The GitHub repository is already one copy of:

- recipes;
- metadata;
- site code;
- infrastructure configuration.

TrueNAS should still back up the local repository clone and/or dataset according to the existing NAS backup strategy.

Images are part of Git and therefore part of repository history.

Generated site releases do not require long-term backup because they can be regenerated.

---

# 40. Network Access

## Local access

Phase 6 uses the owner's chosen stable LAN IP-and-port contract:

```text
http://<truenas-ip>:<published-host-port>
```

Caddy listens on unprivileged port 8080 inside its bridge-network container. TrueNAS publishes one operator-selected host port. This is ordinary port publishing, not host networking, and does not conflict with a TrueNAS dashboard using host port 8080. Local DNS is not required; LAN clients use `http://<truenas-ip>:<host-port>`.

## Remote access

A Cloudflare Tunnel routes an authenticated hostname to `http://<truenas-ip>:<host-port>`. Cloudflare's identity provider and a self-hosted Access application restrict access to approved identities. Anonymous requests were verified to receive an Access-login redirect before and after binding the origin. No router port-forward exists. TLS, WAF rules, and an unguessable hostname are not access control, so the Access policy must remain fail-closed.

---

# 41. Caching

Recipe publication should become visible quickly.

Use aggressive caching for hashed static assets.

Use shorter/no-cache behavior for:

- HTML;
- search index pointer/manifests if applicable.

Do not accidentally make the browser hold an old search index after the site HTML has updated.

A versioned search asset derived from the Git SHA is ideal.

Example:

```text
/search/index-c813ef0.json
```

The generated HTML references the correct version.

---

# 42. Progressive Web App — Deferred

PWA/offline support is attractive for a kitchen app but should be deferred.

Potential future benefits:

- cookbook opens even if Wi-Fi briefly disappears;
- installable tablet icon;
- offline recipe browsing.

Risks:

- service-worker caching can make deployment freshness confusing;
- stale assets are harder to diagnose.

Implement only after ordinary web deployment is stable.

---

# 43. AI / Agent Integration Roadmap

AI should consume the **recipe content**, not become embedded into the storage model.

Possible stages:

## Stage A — raw repository access

An agent can simply read:

```text
recipes/**/*.md
```

Question:

```text
What chicken recipes do I have?
```

No additional architecture required.

## Stage B — normalized static export

Agent consumes:

```text
/api/recipes.json
```

Useful for structured queries.

## Stage C — command-line query tool

Example:

```bash
cookbook search "chicken under 30 minutes"
```

## Stage D — MCP server

Expose tools such as:

```text
search_recipes(query)
get_recipe(slug)
list_recipes(tags)
find_recipes_by_ingredients(ingredients)
```

MCP should read the Markdown/normalized export.

It should not become the canonical owner of recipes.

## Stage E — semantic retrieval

Only consider embeddings/vector search if lexical search proves inadequate.

Likely AI queries:

- "What should I make tonight?"
- "I have chicken, spinach, and rice."
- "Give me something under 30 minutes."
- "What uses the sour cream I need to finish?"
- "Give me three dinners that don't repeat proteins."
- "What recipes have I marked as favorites?"

The existing metadata schema already enables much of this without embeddings.

---

# 44. Future Pantry Integration

Pantry inventory is fundamentally different from recipe content because it changes frequently.

If implemented later:

```text
Recipes
Markdown / Git

Pantry
runtime state / database
```

Do not put live pantry quantities in recipe Markdown.

Potential future model:

```text
recipes ────┐
            ├──► recommendation engine
pantry DB ──┘
```

This clean separation allows the static cookbook to remain simple.

---

# 45. Future Meal Planning

Meal plans are also mutable runtime/user state.

Possible future storage:

- small SQLite database;
- calendar integration;
- plain YAML planning file if editing remains Git-based.

Do not choose now.

Build the cookbook first.

---

# 46. Potential Future Recipe Schema Enhancements

Only add these when a use case exists:

```yaml
equipment:
  - dutch oven

diet:
  - vegetarian

allergens:
  - dairy

season:
  - winter

freezer_friendly: true

leftovers: excellent

cost: low

active_minutes: 20

marinate_minutes: 60
```

Structured ingredient objects may eventually support pantry matching, but they are intentionally deferred.

---

# 47. Recipe Provenance

When importing external recipes, preserve the source.

Do not present copied recipes as original work.

Suggested pattern:

```yaml
source:
  name: Example Site
  url: https://example.com/recipe
```

Notes can explain local changes:

```markdown
## Notes

Adapted from the linked source.

Changes:
- doubled garlic;
- reduced sugar;
- increased baking time by 5 minutes.
```

Git history then captures how the household version evolves.

This is one of the strongest reasons to keep the cookbook in Git.

---

# 48. Migration / Import Strategy

Do not attempt to migrate every existing recipe before launching the site.

Recommended:

1. Build the system with 5 sample recipes.
2. Validate kitchen usability.
3. Import 20 frequently used recipes.
4. Tune schema/search based on reality.
5. Gradually move old bookmarks into Markdown.

Otherwise the migration backlog can prevent the actual system from ever becoming useful.

---

# 49. Implementation Phases

## Phase 0 — Repository bootstrap

**Status: Complete.**

Deliverables:

- private GitHub repository;
- Node project;
- Astro project;
- top-level `recipes/` directory;
- initial README;
- this project plan.

Acceptance:

```bash
npm ci --ignore-scripts
npm run dev
npm run build
```

works.

---

## Phase 1 — Recipe content pipeline

**Status: Complete.**

Deliverables:

- recipe content collection;
- Zod validation;
- recipe slug handling;
- 3–5 example recipes;
- recipe route generation;
- image resolution;
- draft exclusion.

Acceptance:

- adding a Markdown recipe creates a route;
- malformed required metadata fails the build;
- draft recipes are not published.

---

## Phase 2 — Core UI

**Status: Complete.** The implemented brand and typography decisions are recorded in [`docs/BRAND.md`](docs/BRAND.md).

Deliverables:

- base layout;
- homepage;
- recipe cards;
- recipe page;
- responsive CSS;
- print CSS;
- basic dark mode using system preference.

Acceptance:

- good phone experience;
- good tablet experience;
- readable while cooking;
- JavaScript disabled still permits recipe browsing.

---

## Phase 3 — Search

**Status: Complete and verified (2026-08-27).** Search is a progressively enhanced `/search/` page backed by a build-generated MiniSearch index. The implemented simple-filter boundary is favorite, category, and tag; time remains result-display metadata and is deliberately deferred as a query/filter concern to a future AI/API phase. `npm test` passes all search behavior tests, and `npm run build` generates and validates the index against every published recipe route.

Deliverables:

- shared active-recipe normalization and index options;
- Astro static JSON endpoint at `/search/index.json`;
- serialized MiniSearch index with compact stored fields;
- progressively enhanced search page/component;
- all-term typo-tolerant and prefix search;
- metadata-aware field ranking;
- favorite, category, and tag filters;
- shareable URL state and history restoration;
- generated-artifact smoke verification.

Acceptance examples:

```text
"chiken tikka"
```

finds Chicken Tikka Masala.

```text
"garam masala"
```

finds recipes containing that ingredient.

Search should feel instantaneous with the current recipe collection.

Implemented query parameters are `q`, `favorite`, repeated `category`, and repeated `tag`. Filters use AND semantics between groups and OR semantics within category/tag groups. The browser caps display at 20 results and fetches the serialized index only when a query or filter is used.

---

## Phase 4 — Generated API artifact

**Status: Complete and verified (2026-08-27).** Astro prerenders `/api/recipes.json` as a deterministic top-level array from the same alphabetized active-recipe query used by pages and search. Unit tests lock the normalization contract, and `npm run build` validates the generated artifact against every published recipe route.

Implemented contract:

- every object always includes `slug`, canonical recipe `url`, `title`, and trimmed raw Markdown `body`;
- populated taxonomy/list metadata and lightweight extracted `ingredients` remain arrays;
- snake-case frontmatter time fields are exported as camelCase minute fields;
- `source` contains only populated members, dates use `YYYY-MM-DD`, and images expose a root-relative generated URL plus width, height, and format;
- `favorite` is emitted only when true, while false is the documented default;
- `status`, nulls, empty optional containers, schema defaults, and build timestamps are omitted;
- ingredient extraction covers every level-two heading ending in `Ingredients`, removes list markers and subsection headings, and retains unbulleted prose without claiming to be a structured ingredient parser; and
- compatibility is additive: consumers ignore unknown fields, while existing field names, meanings, and types require an explicit contract revision to change.

Acceptance:

- all active recipes are represented in stable title/slug order;
- draft and archived recipes are absent;
- the artifact is valid JSON with a top-level array; and
- API slugs exactly match generated recipe-route slugs.

---

## Phase 5 — CI

**Status: Complete and verified (2026-08-27).** A unified, least-privilege GitHub Actions workflow validates pull requests targeting `main` and pushes to `main` on a GitHub-hosted Ubuntu runner with Node 24 from `.nvmrc`. It performs a clean `npm ci --ignore-scripts`, runs the existing tests and production build, and explicitly requires `dist/index.html`.

Implemented artifact contract:

- only successful pushes to `main` upload an artifact; pull requests perform the same validation without uploading;
- the artifact is named `site`, retains for 14 days, and fails upload if `dist/` is missing;
- the contents of `dist/` are the artifact root, so extraction places `index.html`, recipe routes, `/search/index.json`, and `/api/recipes.json` directly at the deployable root; and
- official actions are commit-SHA pinned, checkout credentials are not persisted, npm caches downloads keyed by `package-lock.json`, token access is read-only, and superseded same-PR/branch runs are cancelled.

Deliverables:

- pull-request validation workflow;
- `main` build workflow;
- static artifact upload;
- clean-build verification.

Acceptance:

- invalid recipe PR fails;
- successful `main` build produces deployable artifact.

---

## Phase 6 — TrueNAS serving

**Status: Complete (2026-08-29).** Repository-owned infrastructure is implemented in [`infrastructure/`](infrastructure/). TrueNAS host lifecycle, persistence, permission-boundary, HTTP, Cloudflare Access, iOS/iPadOS kitchen use, and desktop-browser checks all passed.

Implemented contract:

- a dedicated Host Path dataset uses `config/Caddyfile`, `site/releases/<commit-sha>`, and a relative `site/current` symlink; Caddy mounts the parent `site/` path read-only so an atomic switch is visible without a restart;
- Caddy serves HTTP only on container port 8080 with no SPA fallback or directory browsing, zstd/gzip compression, conservative security headers, `no-cache` revalidation for ordinary files, and one-year immutable caching only under `/_astro/`;
- the Docker Official Image is pinned as `caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648` (verified AMD64 child `sha256:98eb57d882ccd5213d1688764db10c1ca2c58a1ca3a6717a3411ad798f7a423a`);
- Compose runs numeric non-root user `568:568`, uses a read-only root and bind mounts, drops every Linux capability, enables no-new-privileges, bounds CPU/memory/PIDs/logs, and creates only bounded tmpfs runtime mounts;
- because the official binary carries `cap_net_bind_service` and Linux refuses to execute it after that capability is removed from the bounding set, startup copies it to `/config` tmpfs (stripping the file capability) before execution; this preserves both the exact pinned image and an actually capability-free Caddy process;
- bridge networking maps one selected TrueNAS host port to container TCP 8080; LAN clients use `http://<truenas-ip>:<host-port>` and local DNS is not required;
- the Phase 6 publisher originally validated required files, rejected artifact symlinks/unsafe IDs, cleaned failed staging, refused duplicate releases, made content read-only, and atomically replaced `current`; Phase 7 preserves those safety properties while adding external ownership metadata and exact managed retries; and
- the operator runbook covers dataset/ACL setup, artifact transfer, YAML installation, LAN testing, authenticated Cloudflare access, restart/replacement, rollback, and write denial.

Repository verification completed:

- current tests and production build passed, including generated search/API artifact checks;
- publisher edge cases passed for valid/missing artifacts, duplicate IDs, spaces in paths, symlink/unsafe input, failed staging cleanup, first publication, and two-release switching;
- temporary Compose rendering confirmed exactly two read-only host binds, bounded tmpfs mounts, no anonymous volume, and the intended security/resource settings;
- `caddy validate` and `caddy adapt --validate` passed under the exact pinned multi-platform digest while forcing the target AMD64 image;
- a local Compose smoke test passed for `/`, a recipe, search/API JSON, real 404 behavior, HTTP without TLS redirect, gzip/zstd, content types, cache/security headers, denied `/srv` writes, zero effective/bounding capabilities, live atomic release switching, and restart survival.

Live acceptance completed on 2026-08-29:

- TrueNAS Community Edition 25.04.2.6 on x86_64 serves the dedicated Host Path dataset through the selected LAN port;
- an initial dataset-path substitution targeted the boot environment rather than the intended storage pool; files were checksum-verified into the dedicated dataset, ACLs were tightened, the template placeholder was clarified, and the app was updated through TrueNAS middleware;
- Caddy `568:568` can read the selected release but cannot write `/srv`; a password-disabled, non-login publisher identity can modify only `site/`, not `config/` or the parent apps dataset;
- a distinguishable acceptance release was published and served without a Caddy restart, after which `current` was atomically restored to the desired release;
- TrueNAS stop/start and separate redeploys returned healthy, preserved the relative selection and file hashes, and served the same HTTP surface from new containers;
- before deletion, the obsolete boot-environment copy was confirmed unmounted, unreferenced, and byte-identical to the corresponding live release/configuration, then removed with a one-filesystem-bounded command; the live dataset hashes and HTTP service remained unchanged;
- representative phone, tablet/kitchen-device, and desktop-browser rendering passed; no router port-forward exists; and
- after account-restricted Cloudflare Access was configured, anonymous requests to the remote hostname were verified to redirect to the Cloudflare Access login.

Final owner acceptance confirmed that authenticated login reaches the cookbook and representative household devices render it correctly.

---

## Phase 7 — Automated deployment

**Status: Complete and live-verified on TrueNAS 25.04.2.6 (2026-08-30).** The repository-scoped runner, unattended full-SHA publication, authenticated delivery, safe retry, cleanup hook, and migration cleanup passed acceptance.

Implemented contract:

- the existing GitHub-hosted `validate` job still builds exactly once; only successful `main` pushes upload `site` and schedule the dependent deploy job;
- pull requests never target the self-hosted label, PR cancellation remains enabled, main builds are not canceled, production deploys serialize without cancellation, and a refs-API check skips stale completed builds;
- the deploy job uses `actions/download-artifact` v8.0.1 pinned to commit `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`, downloads the same-run artifact, and invokes installed operations without checkout, npm, Node builds, SSH, or Docker;
- publishing validates required files and rejects artifact symlinks, stages on the destination filesystem, makes content read-only, records ownership/order externally, accepts only byte-identical managed retries, and recovers exact pending transactions without overwriting a release;
- selection is a shared validated atomic relative-symlink operation used by publication and manual/automatic rollback;
- deployment captures the prior selection, verifies homepage, search index, and recipe API bytes through cache-busted direct-LAN requests, restores and verifies the prior release after failure, and skips retention on failed verification;
- retention keeps five managed releases total, protects `current` and the new release, records interrupted pruning, and ignores unmanaged directories; cleanup failure is visible but does not roll back a verified deployment;
- a known-good Phase 6 baseline can be explicitly adopted without modifying content or selection and counts toward retention; obsolete unmanaged Phase 6 acceptance releases require owner-confirmed manual removal;
- the reusable TrueNAS runner package pins official `ghcr.io/actions/actions-runner:2.337.0` to OCI index digest `sha256:e5496277be5d09bc968b3d64911b74e219ac4a3f2edce956a3ecf9271bea1ef4` (verified AMD64 child `sha256:5036480998280bb21e32ade9fe1b02b493861ac314b62ba1aea320b94f56ec97`);
- the runner app uses UID/GID 1001, persistent auto-updating runner-only state, read-only operations/root, bounded tmpfs work/temp, zero capabilities, no-new-privileges, no port, and only a `site/` writable application mount; and
- the one-hour setup token is unset before listener startup and must be removed from app configuration after first registration. No runtime PAT, Cloudflare credential, Docker socket, source mount, or broad NAS credential is used.

Repository acceptance completed:

- existing tests and production build pass;
- deployment tests cover valid publication, malformed artifacts and IDs, unmanaged collisions, explicit adoption, matching/mismatched retries, atomic selection, a six-release retention case, unmanaged preservation, and simulated origin-verification rollback;
- structural checks lock push/dependency/label/concurrency/stale-SHA/action-pin/no-checkout properties and the runner's mounts/tmpfs/hardening; and
- shell syntax and rendered Compose structure pass local validation.

Live acceptance completed:

- a separate repository-scoped runner registered with the `kitchook-deploy` label and remained online after its one-hour setup token was removed from both app configuration and the listener environment;
- UID 1001 can modify only runner state and `site/`; operations are root-owned/read-only, Caddy config and parent datasets reject writes, the root filesystem is read-only, capabilities are dropped, and no port, privileged mode, source mount, or Docker socket exists;
- the selected Phase 6 commit was explicitly adopted without changing `current` or any of its 73 files;
- workflow run `33322073263` built and uploaded `site` on GitHub-hosted infrastructure, then deployed full SHA `883b6a1d7a8ed6b0997f042eebaf3737d6269c70` on only the dedicated runner;
- distinguishable deployment `cefe1db7bd620de46dacc9ae9568a1d5655eca8d` embedded its full SHA in the footer, matched artifact digest `sha256:45890458d48c3fe646600151bbf314e9be31ef3f10070eb2b96e9e437625bfbc`, and served byte-identical homepage/search/API content through the cache-busted LAN origin;
- owner-authenticated Cloudflare Access served that identifier and its click-to-copy behavior, while Caddy retained the same running container;
- a same-run retry accepted the existing release only as byte-identical and managed, retained one history record, reverified the origin, and cleared actions/artifacts/workspace data while preserving runner registration and diagnostics;
- live production was not disturbed solely to manufacture an origin failure or six releases; automated tests cover verified rollback and six-release/five-retained behavior, including unmanaged preservation; and
- the obsolete unmanaged Phase 6 acceptance directory was explicitly removed, the old publisher UID 3004 ACL was revoked, and the adopted baseline remains managed to age out naturally.

Final acceptance passed: a push to `main` produced the matching production site without manual TrueNAS publication or a Caddy restart.

---

## Phase 8 — Import actual cookbook

Deliverables:

- first 20–50 real recipes;
- cleanup of metadata conventions;
- search tuning;
- tag cleanup.

Acceptance:

The household actually uses it instead of bookmarks.

This is the true success criterion.

---

# 50. Deployment Workflow — Conceptual GitHub Actions

The implementation agent should generate the actual workflow using current supported GitHub Actions versions.

Concept:

```yaml
name: Build and Deploy

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - checkout

      - setup node

      - npm ci --ignore-scripts

      - npm test

      - npm run build

      - upload dist artifact

  deploy:
    needs: build

    runs-on:
      - self-hosted
      - kitchook-deploy

    steps:
      - download dist artifact

      - deploy artifact into release directory

      - atomically update current symlink

      - prune old releases
```

Important:

**The deploy job should not require checkout or execute repository build scripts if it can avoid doing so.**

Its responsibility is to publish the already-built artifact.

---

# 51. Recommended npm Scripts

Conceptual:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && npm run search:build",
    "preview": "astro preview",
    "validate": "tsx scripts/validate-recipes.ts",
    "search:build": "tsx scripts/build-search-index.ts",
    "export:recipes": "tsx scripts/export-recipes.ts",
    "test": "vitest run",
    "check": "npm run validate && astro check && npm test"
  }
}
```

Exact package choices may change during implementation.

Prefer using the framework's current official tooling.

---

# 52. Dependency Policy

Keep dependencies conservative.

Expected core dependencies:

- Astro;
- MiniSearch;
- validation/tooling already required by Astro;
- a small test runner if needed.

Before adding a package, ask:

> Is this solving a problem that cannot reasonably be handled in a few lines of project code or existing platform functionality?

Do not install a 50-package UI toolkit to render a button.

---

# 53. Search Alternative: Pagefind

Pagefind is the main alternative worth preserving in architectural notes.

Pagefind runs after a static site build and creates a static search bundle from generated HTML.

Advantages:

- very little custom indexing code;
- built specifically for static sites;
- strong default search experience.

MiniSearch is preferred initially because this project wants deliberate control over:

- fuzzy matching;
- prefix behavior;
- metadata field boosting;
- ingredient weighting;
- custom result ranking.

If the custom MiniSearch implementation becomes more maintenance than value, Pagefind is the first replacement to evaluate.

This decision does **not** affect recipe storage.

---

# 54. Static Site Generator Alternative

Astro is not sacred.

Possible future replacements:

- Hugo;
- Eleventy;
- custom generator;
- another static framework.

The project succeeds architecturally if replacing Astro requires changing:

```text
src/
build scripts
```

but **not** rewriting:

```text
recipes/
```

---

# 55. Disaster Recovery Test

A good architecture should pass this thought experiment:

> The TrueNAS application and all generated static files disappear.

Recovery:

```text
git clone cookbook
npm ci --ignore-scripts
npm run build
deploy dist/
start Caddy
```

Cookbook restored.

No database restore required.

---

# 56. Definition of Done for Version 1

Version 1 is complete when all of the following are true:

- [x] Recipes are Markdown files under `recipes/`.
- [x] Recipe images can live beside recipe files.
- [x] Frontmatter is validated.
- [x] Only `title` is fundamentally required for a basic recipe.
- [x] Draft recipes do not publish.
- [x] Static pages are generated with Astro.
- [x] Recipe pages work well on phones and tablets.
- [x] Search works in the browser without a backend.
- [x] Search supports fuzzy matching.
- [x] Search supports ingredient/title/tag queries.
- [x] Search results are sensibly ranked.
- [x] A generated `recipes.json` exists.
- [x] The production site runs through Caddy on TrueNAS.
- [x] Caddy only needs read access to generated site files.
- [x] Production does not require Node.
- [x] Production does not require a database.
- [x] CI validates every pull request targeting `main` and every push to `main`.
- [x] Merge to `main` builds the static artifact.
- [ ] Successful `main` builds automatically deploy.
- [ ] Deployment does not require logging into the TrueNAS UI.
- [ ] Deployments are versioned by Git SHA.
- [ ] Rollback is possible by switching the active release.
- [ ] The actual household cookbook contains enough real recipes to be useful.

---

# 57. Coding Agent Instructions

When handing this project to Codex or another coding agent, use the following priorities.

## Priority 1: preserve the content model

Never make recipe Markdown depend unnecessarily on implementation details.

## Priority 2: minimize infrastructure

Do not introduce a backend/database merely because it is conventional.

## Priority 3: static-first

Assume pages can be prerendered unless proven otherwise.

## Priority 4: kitchen usability

Optimize for actual cooking:

- touch;
- readability;
- speed;
- minimal distractions.

## Priority 5: automated validation

Bad content should fail CI before deployment.

## Priority 6: replaceability

Frameworks and libraries are implementation details.

`recipes/` is the asset.

---

# 58. Agent Guardrails

A coding agent should **not** make the following changes without explicit approval:

- move recipes into a database;
- convert Markdown recipes to MDX without a demonstrated requirement;
- require every recipe to have extensive metadata;
- add a CMS;
- add authentication;
- add a server-side application;
- add a frontend SPA framework;
- add a vector database;
- add Docker-in-Docker;
- mount the Docker socket into the deployment runner;
- expose TrueNAS management interfaces to the internet;
- make production deployment dependent on manually opening TrueNAS;
- make a recipe change require rebuilding the Caddy image.

---

# 59. Decisions That Are Intentionally Deferred

Do not block implementation on these:

- public domain name;
- Tailscale;
- pantry inventory;
- PWA;
- AI assistant;
- MCP;
- ingredient parsing;
- nutrition;
- meal planning;
- grocery lists;
- serving-size scaling;
- recipe import automation.

The architecture already leaves room for them.

---

# 60. Open Questions to Resolve During Implementation

These are real implementation decisions but are not architecture blockers:

1. Exact TrueNAS dataset path: resolved operationally and intentionally omitted from public documentation.
2. Final published host port: resolved operationally and intentionally omitted from public documentation.
3. Exact self-hosted runner packaging: resolved in Phase 7 as a separate hardened TrueNAS Custom App around GitHub's public official runner image, with persistent runner-only state and ephemeral job workspace.
4. Preferred repository name.
5. Whether categories and `meal` are redundant after real-world usage.
6. Whether recent recipes should be determined from frontmatter or Git metadata.

Resolved for Phase 6: LAN access uses a stable TrueNAS IP plus an operator-selected published port; local DNS is not required; Caddy listens on container port 8080 on the ordinary bridge network; and remote access uses an account-restricted Cloudflare Access application with no router port-forward.

Coding agents should choose conservative defaults and document decisions rather than stalling the project for minor choices.

---

# 61. Expected Steady-State Workflow

Once complete, normal use should look like this:

```text
I find a recipe I want to keep
            │
            ▼
recipes/new-recipe/recipe.md
            │
            ▼
git commit
            │
            ▼
git push
            │
            ▼
GitHub validates/builds it
            │
            ▼
TrueNAS deploy runner publishes it
            │
            ▼
Open cookbook in kitchen
            │
            ▼
search "tacos"
            │
            ▼
cook dinner
```

There should be no dashboard login and no manual container update.

---

# 62. Long-Term Architecture

The system can evolve without replacing its foundation:

```text
                        ┌───────────────┐
                        │ Git Recipes   │
                        │ Markdown      │
                        └───────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        Static Website      MCP / AI         CLI Tools
        Astro + Search      assistant        scripts
              │
              ▼
           Caddy
              │
              ▼
          household
```

Later:

```text
Git Recipes ─────────────┐
                        │
Pantry Database ─────────┼──► Meal Planner / AI
                        │
Preferences ─────────────┘
```

The cookbook itself stays boring.

That is intentional.

---

# 63. Architecture Decision Summary

| Concern | Decision |
|---|---|
| Canonical recipe format | Markdown |
| Metadata | YAML frontmatter |
| Images | Stored beside recipe |
| Version control | Private GitHub repository |
| Website generator | Astro |
| Production output | Fully static |
| Search | MiniSearch |
| Search database | None |
| Machine-readable export | Generated static JSON |
| Production web server | Caddy |
| Production runtime | Docker on TrueNAS SCALE |
| Build environment | GitHub-hosted Actions runner |
| Deployment environment | Repository-scoped self-hosted runner |
| Deployment artifact | `dist/` static files |
| Deployment version | Git commit SHA |
| Release strategy | Versioned directories + `current` symlink |
| Backend | None |
| Database | None |
| Authentication | None initially |
| Remote access | Private network; Tailscale later if desired |
| AI | Deferred; consumes Markdown/JSON later |
| Pantry state | Separate runtime store later |
| Framework lock-in | Explicitly avoided |

---

# 64. Reference Documentation

These are implementation references, not additional architecture requirements.

### Astro — Markdown

https://docs.astro.build/en/guides/markdown-content/

Astro supports Markdown with frontmatter and recommends content collections for groups of similarly structured content.

### Astro — Content Collections

https://docs.astro.build/en/guides/content-collections/

Use the current Astro content collection API and loader conventions when implementation begins.

### MiniSearch

https://github.com/lucaong/minisearch

MiniSearch supports browser-side full-text search, prefix matching, fuzzy matching, field boosting, filtering, and serialized indexes.

### Pagefind

https://pagefind.app/docs/

Alternative static-site search system worth considering if maintaining custom search behavior becomes unnecessary.

### GitHub — Self-hosted runners

https://docs.github.com/en/actions/concepts/runners/self-hosted-runners

### GitHub — Adding self-hosted runners

https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners

### GitHub — Secure use of Actions

https://docs.github.com/en/actions/reference/security/secure-use

Self-hosted runners execute workflow-controlled code and should be treated as trusted infrastructure.

### TrueNAS — Custom Apps

https://apps.truenas.com/managing-apps/installing-custom-apps/

TrueNAS supports custom application installation through Docker Compose YAML.

---

# 65. Final Project Rule

When evaluating any proposed feature or architectural change, ask:

> **Does this make the recipe collection more useful without making the recipe collection dependent on the application?**

If yes, it is probably aligned with the project.

If the proposal requires recipes to become dependent on a database, proprietary CMS, frontend framework, or AI system, reconsider it.

The ideal outcome is a cookbook that is sophisticated in what it can do but extremely boring in what it requires to survive.
