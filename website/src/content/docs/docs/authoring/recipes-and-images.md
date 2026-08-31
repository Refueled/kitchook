---
title: Recipes and images
description: Keep a recipe and its assets together.
---

A content directory contains `instance.config.json` and a `recipes/` directory. Each recipe uses a lowercase kebab-case directory slug and a `recipe.md` file:

```text
my-cookbook/
├── instance.config.json
└── recipes/
    └── garlic-butter-pasta/
        ├── recipe.md
        └── finished-dish.jpg
```

Colocate images with the recipe that uses them. KitchooK! validates image references during the build and writes optimized output assets. At least one recipe must be `active`; drafts and archives remain source content but are excluded from normal publication.

For the complete schema, image rules, statuses, and validation messages, read the [authoring reference](https://github.com/Refueled/kitchook/blob/main/docs/authoring.md).
