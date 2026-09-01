# OCI builder

The KitchooK! builder is a one-shot OCI image, not a web server. It reads a cookbook content directory and writes a complete static artifact that any ordinary static host can serve.

## Image and release contract

The public image is:

```text
ghcr.io/refueled/kitchook
```

The first distribution release was `0.1.0`. Releases use semantic versions and publish `linux/amd64` and `linux/arm64` manifests. Pin a production instance to both a version and the immutable digest recorded on its GitHub release. The current release is:

```text
ghcr.io/refueled/kitchook:0.1.4@sha256:079e6388159c529f21bb4c9e7152eddcfcd6ea69be68aaf07a9adf4be7b7728c
```

Do not substitute an image digest from a different tag. The release notes identify the source revision, OCI digest, and supported contract.

## Build a cookbook

Prepare a content directory as described in the [distribution contracts](contracts.md): it must contain `instance.config.json` and `recipes/`.

The builder runs as the unprivileged `node` user (UID 1000). Create an output directory writable by UID 1000, then mount input read-only and output read-write:

```sh
mkdir -p output
sudo chown 1000:1000 output
docker run --rm \
  -v "$PWD/my-cookbook:/input:ro" \
  -v "$PWD/output:/output:rw" \
  ghcr.io/refueled/kitchook:0.1.4@sha256:079e6388159c529f21bb4c9e7152eddcfcd6ea69be68aaf07a9adf4be7b7728c
```

Astro uses a disposable workspace in the one-shot container's writable layer, then copies only a complete, verified static artifact to `/output`. The default entrypoint is equivalent to `kitchook-build /input /output`. It does not install npm dependencies, modify the input mount, contact a content service, or start a server. The image still executes as the non-root `node` user; do not override it with root.

On macOS Docker Desktop/Colima, bind mounts may not preserve host ownership for UID 1000. Use a Docker named volume initialized for UID 1000 instead, or configure the VM's file-sharing ownership mapping before using a host output directory:

```sh
docker volume create kitchook-output
docker run --rm --user root --entrypoint sh \
  -v kitchook-output:/output \
  ghcr.io/refueled/kitchook:0.1.4@sha256:079e6388159c529f21bb4c9e7152eddcfcd6ea69be68aaf07a9adf4be7b7728c \
  -c 'chown 1000:1000 /output'
docker run --rm \
  -v "$PWD/my-cookbook:/input:ro" \
  -v kitchook-output:/output:rw \
  ghcr.io/refueled/kitchook:0.1.4@sha256:079e6388159c529f21bb4c9e7152eddcfcd6ea69be68aaf07a9adf4be7b7728c
```

The initialization command is the only root process; the builder remains unprivileged. Mount `kitchook-output` read-only into a static-server container or copy its files out after the build.

It builds and verifies in a private staging directory before publication. A malformed collection exits nonzero before replacing a pre-existing output artifact. On success, `/output` directly contains `index.html`, `404.html`, `recipes/`, `search/index.json`, `api/recipes.json`, and `_astro/`.

## Local image development

The image is built from the reviewed, digest-pinned official Node 24.12.0 Debian Bookworm slim image. The Dockerfile uses the lockfile and installs dependencies only during image construction with:

```sh
npm ci --ignore-scripts
```

Build a local development image with explicit source metadata:

```sh
docker build \
  --build-arg VERSION=0.1.4-dev \
  --build-arg REVISION="$(git rev-parse HEAD)" \
  -t kitchook-builder:dev .
```

Then replace the image reference in the preceding `docker run` command with `kitchook-builder:dev`. Do not use this development tag for a production instance.

## Base-image provenance

`Dockerfile` pins `node:24.12.0-bookworm-slim` to reviewed OCI index digest `sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99`, resolved from Docker Hub. It is Docker's official Node image and provides the Node 24 runtime required by this project. Update its tag and digest together only after reviewing upstream Node image release notes, supported-platform manifests, lockfile/dependency behavior, and a clean builder test.
