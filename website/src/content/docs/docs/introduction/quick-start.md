---
title: Quick start
description: Build the bundled examples locally.
---

## Requirements

Use Node.js 24 LTS (Node.js 22.12 or newer is supported) and npm 9.6.5 or newer.

## Build the examples

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
npm ci --ignore-scripts
npm test
npm run build
npm run preview
```

Open the local address printed by `npm run preview`. The static site is in `dist/`.

## Build your own collection

Create a content directory containing `instance.config.json` and `recipes/`, then build it without changing KitchooK! source:

```sh
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

Read [local source builds](/docs/building/local-source-build/) for the recipe folder and full validation contract, or use the [versioned builder container](/docs/building/builder-container/) without installing dependencies.
