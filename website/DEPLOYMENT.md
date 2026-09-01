# kitchook.com deployment

`website/` is an independent Astro/Starlight package. Its output is a static artifact and its workflow uses only GitHub-hosted runners. It has no access to the private cookbook repository, owner runner, TrueNAS datasets, or cookbook-host credentials.

## Cloudflare Pages setup

The deployment uses two **Direct Upload** Cloudflare Pages projects:

- `kitchook-com` for `https://kitchook.com` and `https://www.kitchook.com`;
- `demo-kitchook-com` for `https://demo.kitchook.com`.

To recreate the setup, set `main` as each project's production branch. In Cloudflare DNS, create proxied CNAME records for the custom domains using the target Pages project domains shown by Cloudflare. Cloudflare provisions and renews HTTPS certificates after DNS validation.

Create a Cloudflare API token limited to **Account → Cloudflare Pages → Edit** for these two projects only. Store it as the `CLOUDFLARE_API_TOKEN` GitHub Actions secret and store the account ID as `CLOUDFLARE_ACCOUNT_ID`. Do not reuse a token that can manage DNS, Workers, R2, or any owner-instance infrastructure.

The workflows direct-upload the already-built static artifacts with the locked `wrangler` CLI. They do not use Cloudflare's Git integration or run a provider-side dependency install.

## Deployment behavior

- `.github/workflows/deploy-website.yml` runs only when `website/**` changes on `main`; it checks, builds, verifies local links, and deploys `website/dist/` to `kitchook-com`.
- `.github/workflows/deploy-demo.yml` runs only when public builder/example inputs change on `main`; it runs the root test/build and deploys root `dist/` to `demo-kitchook-com`.
- Neither workflow targets a self-hosted runner. Both use `npm ci --ignore-scripts` and the GitHub-hosted `ubuntu-latest` runner.
- The committed `_headers` files cache fingerprinted `/_astro/` assets for one year with `immutable`; HTML, search, and API responses remain revalidatable. Treat HTML updates as cache-sensitive: purge the affected URL or use the Pages deployment rollback control if a stale response persists.

## Redirects, verification, and recovery

Configure `www.kitchook.com` to redirect permanently to `kitchook.com` in Cloudflare Redirect Rules. Keep the apex as the canonical origin. `demo.kitchook.com` has no `www` alias.

After a production deployment, verify HTTPS and the expected content at:

```text
https://kitchook.com/
https://kitchook.com/docs/introduction/quick-start/
https://demo.kitchook.com/
https://demo.kitchook.com/search/index.json
https://demo.kitchook.com/api/recipes.json
```

For an accidental or bad deployment, use the Cloudflare Pages dashboard to roll the relevant project back to its previous successful deployment. This rollback changes only the selected static website/demo artifact; it never rebuilds or touches a private cookbook release. If Cloudflare is unavailable, preserve the Git commit and completed GitHub Actions artifact, correct the failure, and redeploy from a new verified run after service recovery.
