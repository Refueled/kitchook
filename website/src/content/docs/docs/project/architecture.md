---
title: Architecture
description: A small build tool with static output.
---

KitchooK! reads a recipe folder and writes a separate static site:

```text
KitchooK! builder + recipes and config
                  ↓
          completed static files
                  ↓
          compatible static host
```

Validation, HTML rendering, referenced-image optimization, search indexing, and JSON export happen during the build. The generated files can be replaced and rebuilt; the Markdown and photos remain the source collection.

This separation means:

- A build does not write to the selected recipe folder.
- Recipes can change without modifying KitchooK! source code.
- The builder version can change without copying private recipes into the application repository.
- The deployed host needs the completed files, not Node.js or the original Markdown.
