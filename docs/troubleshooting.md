# Troubleshooting

## Validation fails

Read the first reported file and field. Common causes are an unknown frontmatter key, a blank `title`, a negative or non-integer time, an invalid `status`/`difficulty`, or a malformed `source.url`. The schema is intentionally strict; fix the source instead of bypassing validation.

An active recipe also needs non-blank Markdown content. A `draft` or `archived` recipe is still validated even though it is not published.

## A recipe route is missing

Only `active` recipes receive a route. Confirm the recipe is at `recipes/<lowercase-kebab-slug>/recipe.md`, its directory name is valid, and the build used the intended `KITCHOOK_CONTENT_DIR`. The directory slug, not the title, determines `/recipes/<slug>/`.

## Image validation fails

A frontmatter `image` path is relative to the recipe's `recipe.md`. Ensure the file exists beside that document (or at the specified relative path), is a valid image, and has a readable filename. Do not point at a file outside the recipe collection.

## Configuration fails

The selected content-directory root must contain readable `instance.config.json` and `recipes/`. `title` and `description` are required non-blank strings. `canonicalOrigin`, if used, must be an `http` or `https` origin only—no path, query, fragment, username, or password.

## OCI builder cannot write output

The builder runs as UID 1000. Make the mounted output directory writable by that identity:

```sh
mkdir -p output
sudo chown 1000:1000 output
```

Do not mount output inside input, or input inside output. On Docker Desktop/Colima, host ownership mapping can prevent writes even after `chown`; use the named-volume workaround in [builder.md](builder.md).

## Site works locally but not after deployment

Deploy the contents of `dist/`, not a parent directory containing `dist/`. Confirm the host returns `index.html` at `/`, resolves directory indexes for `/recipes/<slug>/`, serves `/search/index.json` and `/api/recipes.json`, and returns 404 for a nonexistent path. KitchooK! currently supports an origin root only, not a subpath.

If the site is private, protect the static host itself. A recipe's `draft` status does not protect source files accidentally uploaded or exposed.

## Changes appear stale

HTML, search JSON, and API JSON should revalidate (`Cache-Control: no-cache`). Hashed `/_astro/` assets may be cached for one year and should use immutable caching. Purge or invalidate the CDN after deploying changed non-asset files. Never overwrite a release while assuming a client will immediately see it.

## Permission denied on a server

The web-server identity needs read and traverse access to the deployed artifact. The deployment identity needs write access to its staging/release location, but the web server should not. Keep the source collection, generated artifact, and host configuration as separate permission boundaries.
