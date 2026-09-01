---
title: How static generation works
description: From your recipe folder to a static website.
---

A KitchooK! build has one job: turn your Markdown recipes into web-ready static files.

```text
recipes/ + instance.config.json → KitchooK! builder → static site
```

During a build, KitchooK! reads your Markdown files, checks supported metadata and image references, optimizes referenced images, and generates HTML pages, a client-side search index, and an `api/recipes.json` data feed. Visitors receive pre-rendered pages, so the host never needs to process Markdown or query a database.

The output folder contains at least:

```text
index.html
recipes/
search/index.json
api/recipes.json
_astro/
```

Copy the **contents** of the output folder to the web root of a compatible static host. The host must serve directory indexes and ordinary files; it does not need Node.js, a database, or access to the original Markdown.

KitchooK! must be hosted at the root of a domain or subdomain, such as `recipes.example.com`. Hosting it below a path such as `example.com/recipes/` is not supported.
