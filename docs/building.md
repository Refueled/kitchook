# Building a cookbook

Building and hosting are separate operations. A build reads a cookbook content directory and writes a complete static artifact. A host needs only that artifact, never the Markdown source or Node.js.

## Source checkout

Use this path when you want to develop KitchooK! or build from a checked-out, pinned source release.

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
npm ci --ignore-scripts
npm test
KITCHOOK_CONTENT_DIR=/absolute/path/to/my-cookbook npm run build
```

The content directory must contain `instance.config.json` and `recipes/`; see [contracts.md](contracts.md). If `KITCHOOK_CONTENT_DIR` is unset, the checkout itself is used as the content directory, which builds the bundled examples. `npm run build` writes `dist/` by default. It never modifies the selected content directory.

For a local production check:

```sh
npm run preview
```

Astro prints the preview URL. `npm run dev` is for authoring, not deployment.

## OCI builder

The OCI builder is a one-shot build tool, not a web server. It runs as UID 1000, reads `/input` read-only, and writes `/output`. Select a release and copy its exact image digest from the [release notes](releases.md).

```sh
mkdir -p output
sudo chown 1000:1000 output
docker run --rm \
  -v "$PWD/my-cookbook:/input:ro" \
  -v "$PWD/output:/output:rw" \
  ghcr.io/refueled/kitchook:0.1.3@sha256:ea97b19f4634941eacbe83a05324f6497dc577cc48736b939fc696d08eac278b
```

Do not replace the digest with one from another tag. The builder stages and verifies the site before replacing output, so an invalid collection exits nonzero without publishing a partial artifact. It does not install dependencies, start a server, or contact a content service while building.

On Docker Desktop or Colima, a bind-mounted `output/` may not be writable as UID 1000. Use the named-volume procedure in [builder.md](builder.md), or configure the VM's ownership mapping.

## Build output

Serve the contents of the output directory directly. A successful build includes:

```text
index.html
recipes/
search/index.json
api/recipes.json
_astro/
```

Root-origin hosting is supported. Do not deploy it below a subpath such as `https://example.com/cookbook/`; that compatibility contract has not been implemented.

## Build checklist

Before uploading an artifact, confirm the build exits successfully and that `dist/index.html`, `dist/search/index.json`, and `dist/api/recipes.json` are non-empty. For source builds, run `npm test` before `npm run build`. Preserve the source collection separately from generated output; `dist/` is reproducible and disposable.
