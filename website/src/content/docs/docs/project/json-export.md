---
title: JSON export
description: A static, build-time recipe API.
---

Every cookbook build writes `api/recipes.json`. It is a static export generated from the same validated collection used for the HTML routes and search index. There is no runtime API service.

Consumers may fetch the export from the static host when they need structured recipe data. Existing compatibility is additive: fields are not removed or reinterpreted without an explicit policy change and migration decision.

The authoritative field contract and verification behavior live in the [JSON export documentation](https://github.com/Refueled/kitchook/blob/main/docs/contracts.md).
