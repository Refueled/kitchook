# Distribution contracts

KitchooK! turns a content directory into a portable static site. Markdown and colocated images remain canonical; the generated `dist/` directory is disposable.

## Content directory

The build reads one content directory. By default it is the repository root. Set `KITCHOOK_CONTENT_DIR` to use another directory without changing application source.

```text
my-cookbook/
├── instance.config.json
└── recipes/
    └── lowercase-kebab-case-slug/
        ├── recipe.md
        └── optional-image.jpg
```

`recipes/` follows the [recipe authoring contract](../README.md#authoring-recipes): recipe IDs come from directory names, images are resolved beside `recipe.md`, and only active recipes are published. At least one active recipe is required.

For example, from an application checkout:

```sh
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

The build never modifies the selected content directory.

## Instance configuration

`instance.config.json` is required at the content-directory root. Its intentionally small, strict JSON shape is:

```json
{
  "title": "My Cookbook",
  "description": "Recipes our family makes.",
  "canonicalOrigin": "https://recipes.example.com"
}
```

- `title` and `description` are non-blank strings and control the site identity and default metadata.
- `canonicalOrigin` is optional. When present, it must be an `http` or `https` origin only—no path, query, or fragment—and generates canonical page URLs.
- Unknown fields and malformed JSON fail the build with the config-file path and a useful validation error.

Deployment identifiers remain build/deployment metadata, not instance content configuration. The existing optional `PUBLIC_DEPLOYMENT_ID` environment variable is retained for the deployment footer.

## Static output

A successful build emits a host-independent `dist/` root containing at least:

```text
index.html
recipes/
search/index.json
api/recipes.json
_astro/
```

Recipe routes, the search index, JSON export, and optimized images are all derived from the selected content directory. Initial support is for origin-root hosting only.

## Compatibility

Application and content versions are independent. Pin a KitchooK! release/builder in an instance repository, then update recipes or the pinned application version separately. The recipe JSON export is additive: consumers must ignore fields they do not recognize.
