# KitchooK!

KitchooK! is a self-hosted cookbook built from plain Markdown recipes. Recipe content remains the durable source of truth, while Astro produces a fully static site. The repository and npm package retain the lowercase identifier `kitchook`; human-facing references use the branded product name **KitchooK!**.

## Current status

**Phases 0–7 are complete and live-verified.** The current site includes:

- validated top-level Markdown recipes with colocated, optimized images;
- active-only static recipe routes and an alphabetized browse page;
- a responsive cooking-first interface with dark mode and print styles;
- build-generated, client-side MiniSearch search at `/search/`;
- weighted typo-tolerant and prefix queries across metadata, ingredients, and body text;
- favorite, category, and tag filters with shareable URL state;
- a build-generated, active-only recipe export at `/api/recipes.json`;
- automated search/API behavior and production-artifact verification; and
- GitHub Actions validation for pull requests targeting `main` and pushes to `main`;
- a locally validated, hardened Caddy/TrueNAS static-serving package; and
- an advanced, reusable runner package for same-run artifact deployment, verified rollback, and managed retention.

Recipe browsing and direct recipe pages continue to work without JavaScript. JavaScript is limited to interactive search and the progressively enhanced mobile header search disclosure.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the current architecture and roadmap, [docs/contracts.md](docs/contracts.md) for the content/configuration/output contracts, [docs/builder.md](docs/builder.md) for the OCI builder interface, [docs/releases.md](docs/releases.md) for releases and compatibility, and [docs/BRAND.md](docs/BRAND.md) for the durable visual identity guidelines.

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
npm test         # Run search, recipe-export, and deployment behavior/structure tests
npm run build    # Build dist/ and verify the search and recipe API artifacts
npm run preview  # Preview the production build locally
```

## Continuous integration

The GitHub Actions CI workflow runs for pull requests targeting `main` and pushes to `main`. It installs the exact `package-lock.json` dependency graph without lifecycle scripts, runs the tests, builds the production site, verifies the OCI builder contract, and requires `dist/index.html` to exist. Invalid recipe metadata, missing referenced images, blank active recipe bodies, and inconsistent generated search/API artifacts therefore fail before artifact publication.

Successful pushes to `main` upload one artifact named `site` with 14-day retention. Its extraction root is the contents of `dist/`, so `index.html`, `search/index.json`, `api/recipes.json`, recipe pages, and static assets are directly available without a nested `dist/` directory. Pull requests validate the same build but do not upload an artifact.

This application repository does not deploy to a self-hosted runner or any owner infrastructure. A private instance repository owns recipe content, builder pinning, and any production deployment workflow. The reusable advanced runner package and provisioning/rollback/recovery runbook remain in [`infrastructure/runner/`](infrastructure/runner/).

## TrueNAS static serving

[`infrastructure/README.md`](infrastructure/README.md) is the Phase 6 operator runbook. The repository owns:

- an HTTP-only Caddy configuration serving `/srv/current`, with revalidation for ordinary files and one-year immutable caching only for `/_astro/*`;
- a digest-pinned, non-root Compose template with read-only Host Path mounts, zero Linux capabilities, no privilege escalation, a read-only root filesystem, a health check, and bounded resources; and
- release helpers that validate artifacts, create read-only automation-managed releases, safely retry only byte-identical releases, atomically switch/roll back `current`, verify the LAN origin, and prune only explicitly managed history; and
- a version-and-digest-pinned official GitHub runner template with a read-only root/operations mount, ephemeral workspace, no port or Docker socket, and write access only to runner state plus `site/`.

The live layout is `<dataset>/site/releases/<release-id>` plus a relative `site/current`, with Caddy mounting the parent `site/` path read-only. TrueNAS bridge networking publishes a selected host port to container port 8080, so LAN clients use `http://<truenas-ip>:<host-port>` without requiring local DNS.

TrueNAS 25.04.2.6 serves the desired release from a dedicated Host Path dataset. Phase 6 live acceptance passed for the hardened Caddy settings, write denial, atomic release selection, container-replacement persistence, authenticated Cloudflare access, and representative household devices. Phase 7 live acceptance passed for the separate least-privilege runner, same-run digest-verified artifact deployment, full-SHA release selection, byte-verified LAN and authenticated delivery, safe retry, ephemeral workspace cleanup, and migration from the old publisher ACL.

Remote access uses Cloudflare Tunnel with a self-hosted Access application restricted to approved identities; anonymous requests were verified to redirect to Cloudflare Access rather than exposing origin content. There is no router port-forward. Any future hostname must receive equivalent fail-closed authentication—bot, scraper, or AI blocking and TLS are not authentication.

## Using another recipe collection

The bundled recipes are examples. Build another cookbook without changing `src/` by placing `recipes/` and the required `instance.config.json` in one content directory, then setting `KITCHOOK_CONTENT_DIR`:

```sh
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

See [`docs/contracts.md`](docs/contracts.md) for the complete input, configuration, output, and compatibility contracts.

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

Favorite, category, and tag groups combine with AND semantics. Time is display metadata only; time querying/filtering is deliberately deferred to a future phase.

## Recipe JSON export

Astro generates `/api/recipes.json` as a static top-level array, written to `dist/api/recipes.json` during a production build. It contains every active recipe in title/slug order. Draft and archived recipes are excluded through the same publication query used for recipe pages and search.

A representative object is:

```json
{
  "slug": "chicken-tikka-masala",
  "url": "/recipes/chicken-tikka-masala/",
  "title": "Chicken Tikka Masala",
  "body": "## Ingredients\n\n- ...",
  "tags": ["chicken", "curry", "weeknight"],
  "ingredients": ["2 lb boneless skinless chicken thighs, cut into pieces"],
  "totalMinutes": 85,
  "favorite": true,
  "source": {
    "name": "Example Recipe Source",
    "url": "https://example.com/chicken-tikka-masala"
  },
  "created": "2026-03-01",
  "image": {
    "src": "/_astro/hero.oOJX9D3T.jpg",
    "width": 1200,
    "height": 1200,
    "format": "jpg"
  }
}
```

Every object always has `slug`, canonical `url`, `title`, and the trimmed raw Markdown `body`. The following fields are emitted only when populated:

- string arrays: `aliases`, `tags`, `categories`, `cuisine`, `meal`, and extracted `ingredients`;
- metadata: `description`, `prepMinutes`, `cookMinutes`, `totalMinutes`, `servings`, and `difficulty`;
- attribution and dates: populated `source` members plus date-only `created` and `updated` strings;
- local image metadata: a site-usable root-relative `src`, original `width`, `height`, and `format`; and
- `favorite`, only when true. Its omitted default is false.

The export never includes `status`, `null`, empty arrays/objects, schema defaults, or a build timestamp. The raw Markdown body is authoritative within each exported entry. `ingredients` is intentionally lightweight: it gathers human-readable lines from every level-two heading ending in `Ingredients`, removes list markers and subsection headings, and retains unbulleted prose. It is not a structured ingredient parser.

The compatibility policy is additive: consumers should ignore unknown fields. Existing field names, meanings, and types will not be removed or changed without an explicit contract revision. The top-level value remains an array rather than a version envelope.

## Repository layout

```text
recipes/                    Canonical, framework-independent recipe content
src/content.config.ts       Recipe loader and validation schema
src/lib/recipes.ts          Active-recipe publication query
src/lib/recipe-markdown.ts  Shared ingredient-section Markdown helpers
src/lib/recipe-export.ts    Stable machine-readable recipe contract
src/lib/search.ts           Shared normalization and MiniSearch contract
src/components/             Server-rendered recipe and search UI shells
src/scripts/                Plain TypeScript browser interactions
src/layouts/BaseLayout.astro Shared document shell and site chrome
src/pages/                  Astro pages, recipe routes, and JSON endpoints
scripts/                     Production artifact verification
tests/                       Node built-in search, export, and deployment tests
infrastructure/              TrueNAS/Caddy config, deployment helpers, runner package, and runbooks
src/styles/global.css        Responsive, dark-mode, and print presentation
docs/BRAND.md                Visual identity and color semantics
astro.config.mjs            Astro configuration
tsconfig.json               Strict TypeScript configuration
PROJECT_PLAN.md             Architecture and phased implementation roadmap
```
