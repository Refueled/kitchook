---
title: Frontmatter and Markdown
description: Write readable Markdown recipes with a small metadata header.
---

Each recipe is a Markdown file with a frontmatter header at the top:

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

Headings, bullet lists, numbered steps, links, and ordinary Markdown text are rendered on the recipe page. Frontmatter can add details such as prep time, servings, tags, difficulty, an image, source information, and publication status.

If a required field is missing or invalid, the build stops and identifies the affected recipe. KitchooK! checks the supported fields and values; it does not proofread the recipe or require specific Ingredients and Instructions headings.

Supported optional fields are `description`, `aliases`, `tags`, `categories`, `cuisine`, `meal`, `prep_minutes`, `cook_minutes`, `total_minutes`, `servings`, `difficulty`, `favorite`, `image`, `source`, `created`, `updated`, and `status`. See the [complete authoring reference](https://github.com/Refueled/kitchook/blob/main/docs/authoring.md#frontmatter-reference) for accepted values, defaults, and field shapes.
