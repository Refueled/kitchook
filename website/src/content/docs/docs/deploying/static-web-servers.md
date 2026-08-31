---
title: Static web servers
description: Serve the completed output from any ordinary document root.
---

Build first, then copy the **contents** of `dist/` to a static document root. Caddy, nginx, Apache, and equivalent static-file servers work. The host must serve directory indexes and ordinary files; it does not need Node.js, Astro, recipe Markdown, or a database.

Verify the homepage, a recipe route, `search/index.json`, and `api/recipes.json` through the public origin after every deployment. Configure a real 404 response and cache fingerprinted `_astro/` assets aggressively while keeping HTML revalidatable.

See the [generic deployment guide](https://github.com/Refueled/kitchook/blob/main/docs/deploying.md) for Caddy, caching, and verification guidance.
