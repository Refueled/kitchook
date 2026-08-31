---
title: Upgrades and rollback
description: Keep the builder and recipes independently versioned.
---

Pin the selected KitchooK! release, preferably by OCI digest, in the private repository that owns your recipes. A recipe change builds with the current pin; an application upgrade is an explicit pin update followed by validation.

Semantic releases identify compatible builder versions. Schema or static-output contract changes require a documented migration and a major-version decision. The JSON export policy is additive unless explicitly revised.

Keep a completed static artifact for each deployment. Roll back by selecting a previously verified artifact, not by rebuilding old source. This allows a recovery even if source control or build automation is temporarily unavailable.

See [releases and compatibility](https://github.com/Refueled/kitchook/blob/main/docs/releases.md).
