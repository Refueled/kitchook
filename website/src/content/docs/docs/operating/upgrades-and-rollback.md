---
title: Upgrades and rollback
description: Update the builder separately from your recipes and retain a previous site.
---

KitchooK! treats your recipe folder as input and does not write to it during a build. The Docker example also mounts that folder read-only. Keep normal backups anyway; no build tool should be the only protection for your source files.

### Upgrade the builder

Pin both the release version and its immutable image digest. The current builder reference is:

```text
ghcr.io/refueled/kitchook:0.1.3@sha256:ea97b19f4634941eacbe83a05324f6497dc577cc48736b939fc696d08eac278b
```

To upgrade, change the version and matching digest together, build the unchanged collection in a test location, and check the homepage, a recipe, search, and `/api/recipes.json` before publishing it.

### Roll back the built site

Keep the previous verified output until the new deployment has been checked through the real host. If the new site has a problem, restore or reselect that prior output using the host's normal rollback mechanism. This does not require rebuilding the old recipes, though a CDN may need invalidation before visitors see the restored files.
