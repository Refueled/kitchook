---
title: TrueNAS and Caddy deployment
description: The tested home-server deployment pattern.
---

The included homelab setup is tested with TrueNAS Community Edition 25.04.2.6 and Caddy. Other NAS systems or web servers may support a similar design, but they are not covered by the tested runbook.

Each completed build is stored in a versioned release folder. A relative `current` symlink selects the release Caddy serves. Keeping the parent folder mounted lets an operator switch that symlink to a previously verified release without rebuilding the site or restarting Caddy.

If GitHub Actions publishes to a self-hosted runner on the home network:

- Attach the runner only to the private recipe repository, never a public fork.
- Use it only to download and publish an already-built artifact.
- Give it write access only to the site release area, not to Caddy configuration or unrelated storage.

Follow the public [TrueNAS/Caddy operator runbook](https://github.com/Refueled/kitchook/blob/main/infrastructure/README.md) for dataset permissions, static serving, immutable releases, validation, rollback, and the optional dedicated-runner setup.
