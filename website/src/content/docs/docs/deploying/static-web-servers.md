---
title: Static web servers
description: Host the built site with Caddy, Nginx, Apache, or another compatible static host.
---

Copy the **contents** of `dist/` directly into the web root. The root should contain `index.html`, `recipes/`, `search/`, `api/`, and `_astro/`.

A compatible host must serve directory indexes, preserve root-relative URLs, serve ordinary HTML, JavaScript, JSON, and image files, and return a real 404 for missing paths. It does not need Node.js, a database, or an application backend. KitchooK! currently supports only the root of a domain or subdomain, not a subpath.

### Deployment checks

- Open the homepage and a recipe URL.
- Run a search and fetch `/api/recipes.json`.
- Confirm a nonexistent URL returns 404 rather than the homepage.
- Cache fingerprinted files under `/_astro/` for a long time, but keep HTML, search data, and JSON revalidatable so updates appear promptly.
