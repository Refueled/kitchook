---
title: TrueNAS advanced deployment
description: An owner-tested option for immutable static releases.
---

TrueNAS and Caddy are optional deployment choices, not KitchooK! requirements. The advanced profile publishes one completed artifact to an immutable release directory, verifies bytes through the origin, and changes a small selection pointer to roll back without rebuilding.

It uses a repository-scoped self-hosted runner only for final publication. Public pull requests must never be able to schedule work there. Keep all runner registration, production storage, Caddy paths, and credentials in a private instance repository.

The full hardened runbook is maintained with the source [infrastructure documentation](https://github.com/Refueled/kitchook/tree/main/infrastructure).
