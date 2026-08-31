# Authoring recipes

A recipe is a portable Markdown document with optional colocated images. KitchooK! uses the directory name as its stable ID; no database or proprietary recipe format is involved.

## Directory layout

```text
recipes/
└── chicken-tikka-masala/
    ├── recipe.md
    └── hero.jpg
```

Each recipe must be directly below `recipes/`, and its directory must be a lowercase kebab-case slug (`a-z`, `0-9`, separated by single hyphens). That slug generates `/recipes/chicken-tikka-masala/`. Do not rename a published directory unless you can accept the changed URL.

## Minimal recipe

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

`title` and a non-blank Markdown body are required for an active recipe. Use ordinary Markdown. `## Ingredients`, `## Instructions`, and `## Notes` are conventions, not a replacement for readable prose. Every level-two heading ending in `Ingredients` is included in search and the JSON export's lightweight ingredient list.

## Frontmatter reference

The frontmatter schema is strict: unknown fields and invalid values fail the build.

| Field | Value | Notes |
| --- | --- | --- |
| `title` | non-blank string | Required. |
| `description` | non-blank string | Short summary. |
| `aliases`, `tags`, `categories`, `cuisine`, `meal` | list of non-blank strings | Omit or use a list; defaults to an empty list. |
| `prep_minutes`, `cook_minutes`, `total_minutes` | nonnegative integer | Display metadata. |
| `servings` | nonnegative integer or non-blank string | For example, `4` or `"Makes 2 loaves"`. |
| `difficulty` | `easy`, `medium`, or `hard` | |
| `favorite` | boolean | Defaults to `false`. |
| `image` | relative image path | Resolved beside `recipe.md`; must exist and be valid. |
| `source` | object | Optional `name` and/or valid absolute `url`. |
| `created`, `updated` | date | Use an ISO date such as `2026-08-31`. |
| `status` | `active`, `draft`, or `archived` | Defaults to `active`. |

Example:

```md
---
title: Chicken Tikka Masala
description: A weeknight chicken curry.
tags: [chicken, curry]
categories: [dinner]
prep_minutes: 20
cook_minutes: 45
servings: 4
difficulty: medium
favorite: true
image: hero.jpg
source:
  name: Example source
  url: https://example.com/recipe
created: 2026-08-31
status: active
---
```

## Images

Keep an image next to its `recipe.md` and reference it relatively, for example `image: hero.jpg`. Astro validates and optimizes referenced local images during the build. A missing or invalid referenced image fails the build. Do not use an image unless you have permission to redistribute it.

## Publication status

- `active` recipes receive routes and appear on the home page, search index, and `/api/recipes.json`.
- `draft` and `archived` recipes remain validated source content but are not published.

A cookbook needs at least one active recipe. Drafts are not a privacy boundary: protect the entire source collection if it contains private material.
