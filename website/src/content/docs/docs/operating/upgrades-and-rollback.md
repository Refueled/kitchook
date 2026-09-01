---
title: Upgrades and rollback
description: Update the builder separately from your recipes and retain a previous site.
---

KitchooK! treats your recipe folder as input and does not write to it during a build. The Docker example also mounts that folder read-only. Keep normal backups anyway; no build tool should be the only protection for your source files.

### Upgrade the builder

Pin both the release version and its immutable image digest. The current builder reference is:

```text
ghcr.io/refueled/kitchook:0.1.4@sha256:079e6388159c529f21bb4c9e7152eddcfcd6ea69be68aaf07a9adf4be7b7728c
```

To upgrade, select the version and matching digest from the [GitHub releases](https://github.com/Refueled/kitchook/releases), change both together, build the unchanged collection in a test location, and check the homepage, a recipe, search, and `/api/recipes.json` before publishing it.

### Roll back the built site

Keep the previous verified output until the new deployment has been checked through the real host. If the new site has a problem, restore or reselect that prior output using the host's normal rollback mechanism. This does not require rebuilding the old recipes, though a CDN may need invalidation before visitors see the restored files.
