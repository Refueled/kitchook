---
title: Recipes and images
description: How to arrange recipe folders and photos.
---

Your cookbook folder contains `instance.config.json` and a `recipes/` directory. Each recipe lives directly below `recipes/` in a lowercase, hyphen-separated folder with a `recipe.md` file:

```text
my-cookbook/
├── instance.config.json
└── recipes/
    └── garlic-butter-pasta/
        ├── recipe.md
        └── finished-dish.jpg
```

Keep a recipe's image beside its `recipe.md` file and reference it through the frontmatter `image` field. During the build, KitchooK! verifies that this local image exists and is valid, then writes optimized image files for the site. It does not check every image URL written directly in the Markdown body.

At least one recipe must be `active`, which is the default status. Active recipes appear on the site, in search, and in the JSON export. Recipes marked `draft` or `archived` remain in the source folder but are not published. Draft status is not access control, so keep the source folder private when it contains private material.

See [Frontmatter and Markdown](/docs/authoring/frontmatter-and-markdown/) for the supported metadata fields.
