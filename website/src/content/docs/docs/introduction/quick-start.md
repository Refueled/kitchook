---
title: Quick start
description: Build the examples or your own recipe collection.
---

## Current source status

The source repository is still private while the public contribution and security controls are completed. You can view the [live demo](https://demo.kitchook.com) now or use the public [builder container](/docs/building/builder-container/) with your own recipe folder. The source-build steps below will work after the repository opens.

## Source-build requirements

- Node.js 22.12 or newer (Node.js 24 LTS recommended)
- npm 9.6.5 or newer

## Build the example recipes

Once the public source release is available, check out the release you intend to use and run:

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
git checkout v0.1.3
npm ci --ignore-scripts
npm test
npm run build
npm run preview
```

Open the address printed by the preview command. The deployable files are in `dist/`.

## Build your own recipe collection

Create a folder containing `instance.config.json` and `recipes/`, then point `KITCHOOK_CONTENT_DIR` to it:

```sh
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

Read [local source builds](/docs/building/local-source-build/) for the source workflow or use the [builder container](/docs/building/builder-container/) without installing Node.js.
