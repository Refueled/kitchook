---
title: Frontmatter and Markdown
description: Start with ordinary readable recipe files.
---

A minimal active recipe is ordinary Markdown with frontmatter:

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

KitchooK! preserves the useful Markdown shape: headings, ingredient lists, and numbered instructions. Add supported metadata in frontmatter only when it improves the published recipe. Validation errors name the recipe and invalid field so malformed content fails before anything is deployed.

See the [frontmatter reference](https://github.com/Refueled/kitchook/blob/main/docs/authoring.md) for all supported fields and Markdown conventions.
