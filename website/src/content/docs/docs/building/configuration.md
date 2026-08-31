---
title: Configuration
description: The narrow instance configuration contract.
---

Place `instance.config.json` at the root of the content directory:

```json
{
  "title": "My Cookbook",
  "description": "Recipes our family makes.",
  "canonicalOrigin": "https://recipes.example.com"
}
```

`title` and `description` are required non-blank strings. `canonicalOrigin` is optional and, when set, must be an origin URL (for example, `https://recipes.example.com`), not a path.

Configuration is for site identity and deployment-neutral values. Recipe fields belong in recipe frontmatter, and deployment IDs belong in deployment metadata. Invalid configuration stops the build with a useful error.

Read the full [content and output contract](https://github.com/Refueled/kitchook/blob/main/docs/contracts.md).
