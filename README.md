# KitchooK!

**KitchooK!** turns a collection of Markdown recipes and colocated images into a portable, fully static cookbook. Your recipes remain ordinary files; the generated `dist/` directory can be served by any static web server. There is no application server, database, or runtime content service.

## Quick start: build the examples

Requirements: Node.js 24 LTS (Node 22.12+ is supported) and npm 9.6.5+.

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
npm ci --ignore-scripts
npm test
npm run build
npm run preview
```

Open the local URL printed by `npm run preview`. The deployable files are in `dist/`; copy the **contents** of that directory to a static host.

## Build your cookbook

A cookbook is a content directory containing configuration and recipes:

```text
my-cookbook/
├── instance.config.json
└── recipes/
    └── garlic-butter-pasta/
        └── recipe.md
```

```json
{
  "title": "My Cookbook",
  "description": "Recipes our family makes."
}
```

```md
---
title: Garlic Butter Pasta
---

## Ingredients

- 8 oz spaghetti
- 3 tbsp butter

## Instructions

1. Cook the pasta.
2. Toss with melted butter.
```

From a KitchooK! source checkout, build it without modifying application files:

```sh
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

Or use the versioned one-shot OCI builder. Replace the digest with the digest from the selected [GitHub release](docs/releases.md):

```sh
mkdir -p output
sudo chown 1000:1000 output
docker run --rm \
  -v "$PWD/my-cookbook:/input:ro" \
  -v "$PWD/output:/output:rw" \
  ghcr.io/refueled/kitchook:0.1.0@sha256:<release-digest>
```

`output/` then directly contains `index.html`, `recipes/`, `search/index.json`, `api/recipes.json`, and `_astro/`.

## Documentation

- [Author recipes](docs/authoring.md)
- [Content, configuration, and output contracts](docs/contracts.md)
- [Build from source or OCI](docs/building.md)
- [Deploy static files](docs/deploying.md)
- [GitHub-hosted build automation](docs/github-actions.md)
- [Upgrade, rollback, and compatibility](docs/releases.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Advanced TrueNAS/Caddy deployment](infrastructure/README.md)

## What KitchooK! does not support

KitchooK! does not load raw Markdown from S3 or another service at runtime, run Astro or Node.js in production, provide a database/CMS/editor, host multiple users, or support subpath hosting. It builds a site at an origin root; build first, then host the generated files.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run build
```

`npm run dev` starts local development. The repository includes intentional public examples only. Keep private recipes in a separate repository or directory, and pin a KitchooK! release independently from that content.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the distribution and public-launch roadmap.
