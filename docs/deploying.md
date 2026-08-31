# Deploying static files

KitchooK! deployment starts after a successful build. Copy the **contents** of `dist/` (or OCI `/output`) to an origin-root static host. Do not point a host at your recipe source directory and do not run Astro/Node.js in production.

Before deployment, verify these paths exist in the artifact root:

```text
index.html
recipes/
search/index.json
api/recipes.json
_astro/
```

A host must serve directory indexes and ordinary files, return a real 404 for missing paths, and preserve root-relative URLs. Subpath hosting is not supported.

## Any static web server

Copy the artifact contents, not the `dist` directory itself, to the document root:

```sh
rsync -a --delete dist/ /var/www/my-cookbook/
```

`--delete` removes files no longer present in the new artifact. Omit it if that is not the desired ownership model for the destination.

A minimal Caddy site is:

```caddyfile
recipes.example.com {
    root * /var/www/my-cookbook
    file_server

    @astro path /_astro/*
    @notAstro not path /_astro/*
    header @notAstro Cache-Control "no-cache"
    header @astro Cache-Control "public, max-age=31536000, immutable"
}
```

A minimal nginx server block is:

```nginx
server {
    listen 80;
    server_name recipes.example.com;
    root /var/www/my-cookbook;
    index index.html;

    location /_astro/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache";
    }
}
```

Use your host's normal TLS and access-control configuration. Do not add an SPA fallback: missing routes should remain 404s.

## S3 and CloudFront

Create a private S3 bucket and use CloudFront with the bucket as its S3 REST origin. In the distribution setup, select **Allow private S3 bucket access to CloudFront** (Origin Access Control), use HTTPS redirection for viewers, and set the default root object to `index.html`. Keep S3 Block Public Access enabled. CloudFront custom-error rewriting is not needed and must not turn 404s into the homepage.

### Directory routes and missing paths

Unlike a normal static web server, an S3 REST origin does not resolve `/recipes/example/` to `recipes/example/index.html`. Create and publish this CloudFront Function, then associate it with the default behavior's **Viewer request** event:

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }

  return request;
}
```

Private S3 origins return `403` for nonexistent keys unless CloudFront can list the bucket. Add this statement to the bucket policy created for the distribution, replacing the placeholders. It grants only the selected CloudFront distribution—not the public—this permission:

```json
{
  "Sid": "AllowCloudFrontListForMissingObjectResponses",
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:ListBucket",
  "Resource": "arn:aws:s3:::<bucket-name>",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::<account-id>:distribution/<distribution-id>"
    }
  }
}
```

Retain the OAC-created `s3:GetObject` statement. This additional statement makes missing pages return `404` without exposing the bucket or enabling directory listings.

### Upload and invalidate

After building locally or in CI, upload new hashed Astro assets before HTML and other mutable files. Replace the placeholders:

```sh
BUCKET=my-cookbook-bucket
DIST_ID=E123EXAMPLE

aws s3 sync dist/_astro/ "s3://$BUCKET/_astro/" \
  --cache-control "public, max-age=31536000, immutable"
aws s3 sync dist/ "s3://$BUCKET/" --delete \
  --exclude "_astro/*" \
  --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'
```

The second sync preserves `/_astro/` and its long cache policy while removing obsolete non-asset output. The invalidation makes changed HTML, search JSON, and API JSON visible promptly; hashed `/_astro/` assets can remain cached for a year. Test `/`, a recipe URL, `/search/index.json`, `/api/recipes.json`, and a nonexistent URL through CloudFront before considering the deployment complete.

## GitHub-hosted automation

Use GitHub-hosted runners to build a private cookbook and upload a portable artifact, then hand it to your chosen deployment mechanism. The complete template is [github-actions.md](github-actions.md). It does not require TrueNAS or a self-hosted runner.

## Advanced TrueNAS deployment

The repository's hardened Caddy, immutable-release, rollback, and dedicated-runner package is an advanced optional profile, not a requirement. See [infrastructure/README.md](../infrastructure/README.md). Keep owner-specific paths, runner registration, and credentials in a private instance repository.
