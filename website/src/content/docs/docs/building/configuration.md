---
title: Configuration
description: Set up the instance.config.json file.
---

Place `instance.config.json` at the root of your cookbook folder:

```json
{
  "title": "My Cookbook",
  "description": "Recipes our family makes.",
  "canonicalOrigin": "https://recipes.example.com"
}
```

- **`title`** *(required)*: A non-blank title shown in the site header and navigation.
- **`description`** *(required)*: A non-blank description used in page metadata.
- **`canonicalOrigin`** *(optional)*: The `http` or `https` origin where the site is hosted, such as `https://recipes.example.com`. It cannot contain a path, query, fragment, username, or password.

Unknown fields and invalid values stop the build with an error that names the configuration file. Recipe details such as times, ingredients, and tags belong in each recipe's Markdown frontmatter.
