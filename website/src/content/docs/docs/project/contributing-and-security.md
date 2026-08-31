---
title: Contributing and security
description: Safe boundaries for an open static-site builder.
---

KitchooK! is preparing for public contributions. Until the formal contribution guide and security policy ship, please open ordinary product questions in the source repository and do not disclose vulnerabilities in public issues.

The project’s security boundary is deliberate: public workflows run on GitHub-hosted infrastructure; owner deployment runners, private recipes, and production storage are never available to public contributions. Dependency and workflow changes receive additional review because they affect the builder supply chain.

The formal `CONTRIBUTING.md`, `SECURITY.md`, templates, and owner controls are part of the public-launch hardening work. Follow the [project plan](https://github.com/Refueled/kitchook/blob/main/PROJECT_PLAN.md) for current status.
