---
title: How static generation works
description: The input, build, and output contract.
---

A KitchooK! build has one job: turn content into static files.

```text
recipes + instance.config.json → versioned builder → static site
```

The builder reads Markdown, images, and a small instance configuration at build time. It validates the collection and creates homepage and recipe routes, a search index, and `api/recipes.json`. Browsers never fetch raw recipe Markdown from S3, Git, or another content service.

The output root directly contains:

```text
index.html
recipes/
search/index.json
api/recipes.json
_astro/
```

Copy the **contents** of that output directory to a static document root. The host needs no access to Node.js or the source recipes.

KitchooK! initially supports origin-root hosting. Hosting a generated cookbook under a subpath is not supported.
