---
title: Local source build
description: Build your cookbook locally with Node.js.
---

The source repository is currently private while public-launch controls are completed. Until it opens, use the [builder container](/docs/building/builder-container/). Once source releases are public, clone the repository and check out the version you intend to use:

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
git checkout v0.1.3
npm ci --ignore-scripts
npm test
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

`KITCHOOK_CONTENT_DIR` points to the folder containing `instance.config.json` and `recipes/`. If it is unset, KitchooK! builds the bundled examples.

A successful build writes the site to `dist/`. Set `KITCHOOK_OUTPUT_DIR` if you need another output location. Copy the **contents** of the completed output directory to your static host.
