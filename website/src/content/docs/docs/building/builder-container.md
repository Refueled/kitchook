---
title: Builder container
description: Use a pinned, one-shot OCI build without installing Node dependencies.
---

The public OCI image is a builder, not a runtime service. Pin a release tag and its immutable digest from the [releases page](https://github.com/Refueled/kitchook/releases), mount content read-only, and mount an output directory read-write:

```sh
mkdir -p output
sudo chown 1000:1000 output
docker run --rm \
  -v "$PWD/my-cookbook:/input:ro" \
  -v "$PWD/output:/output:rw" \
  ghcr.io/refueled/kitchook:0.1.1@sha256:<release-digest>
```

The builder validates the mounted collection before replacing output. On failure it returns a nonzero status and does not publish a partial artifact. Serve `output/` with your chosen static host.

The image is published for AMD64 and ARM64. Keep the digest in your private instance repository so application upgrades are deliberate changes.
