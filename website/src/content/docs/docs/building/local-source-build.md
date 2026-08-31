---
title: Local source build
description: Build a cookbook from a checked-out KitchooK! release.
---

Clone the source at the release you intend to use, then install its locked dependencies:

```sh
npm ci --ignore-scripts
npm test
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

`KITCHOOK_CONTENT_DIR` selects the directory containing both `instance.config.json` and `recipes/`. If it is omitted, the repository root is used, which builds the bundled public examples.

A successful build writes `dist/` by default. Set `KITCHOOK_OUTPUT_DIR` to direct the generated artifact elsewhere. Do not serve a partially built directory: build successfully first, then copy the completed output to your host.
