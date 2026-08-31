---
title: Architecture
description: Static-first by design.
---

KitchooK! separates public software from private content:

```text
public source + versioned builder
             + private recipes/config
             ↓
      portable static artifact
             ↓
       any static host
```

All validation, rendering, image processing, search generation, and JSON export happen during a build. The production artifact is static and disposable; Markdown and images remain the canonical source.

This design means an application release never requires copying recipes into the public source repository, and changing a recipe does not require publishing KitchooK!.

Read the [full contracts](https://github.com/Refueled/kitchook/blob/main/docs/contracts.md) and the active [project plan](https://github.com/Refueled/kitchook/blob/main/PROJECT_PLAN.md).
