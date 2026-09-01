---
title: Security and recovery
description: Protect private recipes and keep the files needed to rebuild.
---

Keep private recipes and notes in a private repository or local folder rather than a public fork. Draft status only controls publication during the build; it does not protect source files. The generated site contains every active recipe, so protect the static host too when the cookbook is not meant to be public.

### Keep deployment access narrow

- Store deployment keys and provider credentials in the secret store supplied by your CI/CD system, not in recipe files or workflow text.
- Attach a self-hosted runner inside your home network only to the private recipe repository. Public pull requests must not be able to schedule work there.

### Backups and recovery

Keep these three pieces:

1. **Recipe source:** Markdown files, photos, and `instance.config.json`.
2. **Builder selection:** The KitchooK! release version and matching image digest used for the site.
3. **Host configuration:** The Caddy, Nginx, Cloudflare, or other static-host settings needed to serve and protect it.

With those files and a supported Node.js or Docker environment, you can rebuild the static site on another machine. Retaining the previous completed site also gives you a faster rollback when the host supports it.
