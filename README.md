# KitchooK!

KitchooK! turns Markdown recipes and photos into a fast, searchable static cookbook. Your recipes remain ordinary files, while the built site can be served without an application server or database.

[Documentation](https://kitchook.com/docs/introduction/) · [Live demo](https://demo.kitchook.com) · [Quick start](https://kitchook.com/docs/introduction/quick-start/)

## What it does

- Keeps recipes readable as Markdown files with photos beside them.
- Checks supported metadata and image references during the build.
- Generates recipe pages, client-side search, optimized images, and a static JSON export.
- Builds locally with Node.js, in automation, or with the one-shot Docker builder.
- Produces ordinary static files for a compatible web host.

## Try the bundled examples

Use Node.js 24 LTS (Node.js 22.12 or newer is supported) and npm 9.6.5 or newer:

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
npm ci --ignore-scripts
npm test
npm run build
npm run preview
```

Open the address printed by the preview command. The deployable site is in `dist/`.

## Build your cookbook

A cookbook folder contains `instance.config.json` and a `recipes/` directory. From a KitchooK! source checkout, point the build at that folder:

```sh
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

The build reads the selected cookbook folder without modifying it. See the documentation for [recipe authoring](https://kitchook.com/docs/authoring/recipes-and-images/), [configuration](https://kitchook.com/docs/building/configuration/), the [Docker builder](https://kitchook.com/docs/building/builder-container/), and [deployment](https://kitchook.com/docs/deploying/static-web-servers/).

## Current limits

- At least one recipe must be active; draft and archived recipes are not published.
- Generated cookbooks must be hosted at the root of a domain or subdomain. Subpath hosting is not supported.
- Privacy is provided by your source storage and static host, not by recipe status.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run build
```

`npm run dev` starts the cookbook development server. The documentation website is maintained separately under [`website/`](website/).

KitchooK! is available under the [MIT License](LICENSE).
