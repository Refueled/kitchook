---
title: Builder container
description: Build your cookbook with Docker instead of installing Node.js.
---

The public Docker image is a one-shot builder, not a web server. It reads your recipe folder, writes a complete static site, and exits.

Mount the recipe folder at `/input` as read-only and a writable output folder at `/output`:

```sh
mkdir -p output
sudo chown 1000:1000 output
docker run --rm \
  -v "$PWD/my-cookbook:/input:ro" \
  -v "$PWD/output:/output:rw" \
  ghcr.io/refueled/kitchook:0.1.3@sha256:ea97b19f4634941eacbe83a05324f6497dc577cc48736b939fc696d08eac278b
```

The version and digest select the exact published image. When you upgrade, change both using the values from that release.

The builder creates and verifies the site in a staging directory. If recipe validation fails, it exits without replacing files already in `/output`. On success, it replaces `/output` with the completed site.

The image supports Linux AMD64 and ARM64 systems, including common x86 servers, Raspberry Pi, and Apple Silicon Docker environments.
