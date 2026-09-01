---
title: Cloud hosting and automation
description: Build in GitHub Actions and deploy the completed static site.
---

A GitHub Actions workflow can build a private recipe repository on a GitHub-hosted runner and upload the completed site as an artifact. Keep the build job separate from any deployment job, and give each job only the permissions it needs.

The tested workflow builds and uploads the static artifact; deployment is a separate step for your chosen host, such as Cloudflare Pages, S3 and CloudFront, or your own static server.

### S3 and CloudFront

When hosting the site in a private S3 bucket behind CloudFront:

- Upload the **contents** of `dist/`, so `index.html` is at the artifact root. Never upload the raw Markdown source.
- Add a viewer-request CloudFront Function that rewrites directory URLs such as `/recipes/garlic-butter-pasta/` to `/recipes/garlic-butter-pasta/index.html`.
- Give only the selected CloudFront distribution restricted `s3:ListBucket` permission so missing objects return a real 404. Keep S3 Block Public Access enabled.

After deployment, test the homepage, a recipe, search, the JSON export, and a missing URL through the public hostname.
