---
title: Security and recovery
description: Protect recipes, deployment credentials, and static output.
---

Recipes are private by default. Do not put personal recipe collections, credentials, or production host details in the public application repository. A generated cookbook can expose recipe data, so protect it appropriately when it is not intended for public access.

Use GitHub-hosted runners for public validation. If a destination needs a self-hosted runner, scope it to the private instance repository and limit it to the final publication step. Keep static release artifacts independent of both repositories.

Recovery requires three durable pieces: your private recipe collection, a pinned public KitchooK! release, and the static-host configuration. Retain verified artifacts and test selecting a prior release before an incident forces the decision.
