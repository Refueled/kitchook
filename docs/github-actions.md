# GitHub-hosted build automation

This example builds a private recipe repository on a GitHub-hosted runner. It uses the public, pinned builder image and uploads a portable static artifact. It does not target TrueNAS, a self-hosted runner, or any owner infrastructure.

## Private repository layout

Your private repository is content only:

```text
.
├── instance.config.json
├── recipes/
└── .github/workflows/build.yml
```

Pin both a KitchooK! release tag and its immutable digest from the corresponding [GitHub release](releases.md). Review and deliberately update that pin when upgrading.

## Workflow

Create `.github/workflows/build.yml` in the private recipe repository. Replace `0.1.0` and `<release-digest>` together with the selected release values.

```yaml
name: Build cookbook

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 15

    steps:
      - name: Check out private recipes
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - name: Build static artifact
        shell: bash
        run: |
          set -euo pipefail
          output="$RUNNER_TEMP/site"
          sudo install -d -o 1000 -g 1000 "$output"
          docker run --rm \
            -v "$GITHUB_WORKSPACE:/input:ro" \
            -v "$output:/output:rw" \
            ghcr.io/refueled/kitchook:0.1.0@sha256:<release-digest>
          test -s "$output/index.html"
          test -s "$output/search/index.json"
          test -s "$output/api/recipes.json"

      - name: Upload static site
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: site
          path: ${{ runner.temp }}/site/
          if-no-files-found: error
          retention-days: 14
```

The artifact extraction root is the site itself: `index.html` is at its top level. Download it and deploy the contents using [the static-host guides](deploying.md), or add a separate deployment job appropriate to your host.

## Deployment-job boundaries

Keep a deployment job separate from the build job where possible. Grant it only the credential and destination access required by that host; do not give it repository write permissions. Store provider credentials in repository or environment secrets, never recipe files or workflow text. Public pull requests must not receive those secrets or be able to schedule private infrastructure.

For S3/CloudFront, use short-lived cloud credentials through your provider's GitHub OIDC integration and run the upload commands from [deploying.md](deploying.md) after downloading the `site` artifact. Scope cloud permissions to the single bucket prefix and the intended CloudFront invalidation distribution.
