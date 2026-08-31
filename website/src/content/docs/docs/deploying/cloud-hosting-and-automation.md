---
title: Cloud hosting and automation
description: Use a hosted build or upload completed static output.
---

A private recipe repository can build on GitHub-hosted runners and upload a completed static artifact to the host of your choice. The public builder image needs only recipe/config input and an output directory; it never needs production credentials.

For object storage, upload the generated output—not raw Markdown. A private S3 REST origin behind CloudFront requires both directory-index URL rewriting and restricted missing-object lookup permission. Those details are necessary for routes such as `/recipes/example/` to work safely.

Use immutable builder digests in automation, least-privilege upload credentials, and a separate deployment boundary from your content source. See the tested [GitHub Actions example](https://github.com/Refueled/kitchook/blob/main/docs/github-actions.md) and [S3/CloudFront guide](https://github.com/Refueled/kitchook/blob/main/docs/deploying.md).
