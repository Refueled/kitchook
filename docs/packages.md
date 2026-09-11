# Published packages

KitchooK! publishes two small packages to the public npm registry under the `@kitchook` scope. They exist so the generator and companion tooling share one definition of the recipe contract and one source of visual identity rather than copying either.

| Package | Purpose |
| --- | --- |
| `@kitchook/recipe-schema` | The canonical recipe frontmatter contract: field definitions, defaults, publication states, and slug helpers. Dependency-free and Zod-instance agnostic, so callers inject their own Zod namespace. |
| `@kitchook/brand` | The visual identity: design tokens, self-hosted font faces, dark-mode overrides, and the focus-ring contract. |

Package versions are independent of the generator and the OCI builder. Publishing a package does not require an application release, and an application release does not republish a package.

## Ownership

Packages are published by the `refueled` npm account into the `kitchook` npm organization, which owns the `@kitchook` scope. The recorded maintainer address is `npm@kitchook.com`, a forwarded address rather than a personal inbox.

## Trusted publishing

Releases are published by [`.github/workflows/publish-packages.yml`](../.github/workflows/publish-packages.yml) using OIDC trusted publishing. There is no `NPM_TOKEN` and no long-lived publish credential: the runner mints a short-lived OIDC token that the npm CLI exchanges for a scoped publish credential, and provenance attestations are generated automatically because this is a public package from a public repository.

This requires npm CLI 11.5.1 or newer and Node 22.14.0 or newer. The workflow fails with an explicit message if the runner does not meet both.

The publish step lives in the dispatched workflow itself rather than a reusable workflow, because trusted publishing validates the workflow that contains the publish command.

### One-time setup on npmjs.com

Trusted publishing cannot be configured from this repository. For **each** package, on npmjs.com:

1. Open the package, then **Settings**, then **Trusted publishing**.
2. Add a GitHub Actions publisher using exactly:
   - Organization or user: `Refueled`
   - Repository: `kitchook`
   - Workflow filename: `publish-packages.yml`
3. Save.

npm does not validate these values when saving. A mismatch surfaces only as an `ENEEDAUTH` failure at publish time. The fields are case-sensitive, and the workflow filename must include the `.yml` extension.

### Hardening

After trusted publishing is confirmed working, open each package's **Settings**, then **Publishing access**, and select **Require two-factor authentication and disallow tokens**. Trusted publishers keep working because they use OIDC; only traditional token authentication is disabled.

## Publishing a version

1. Bump `version` in that package's `package.json` and update the root lockfile:

   ```sh
   npm install --package-lock-only --ignore-scripts
   npm ci --ignore-scripts
   ```

2. Run the **Publish packages** workflow from `main` with dry-run enabled. It runs the test suite and reports which packages would publish, without uploading.
3. Re-run it with dry-run disabled.

The workflow is version-driven and idempotent. It publishes each non-private workspace package whose version is not already on the registry and skips every other package, so re-running is safe. A real publish is refused unless the workflow runs from `main`.

## Constraints

- A published version is permanent. Correcting a release means publishing a new version; the registry does not allow replacing one.
- The account email is recorded in each version's metadata and cannot be changed retroactively. That is why the forwarded address exists.
- Consumers must ignore unknown fields in the recipe JSON export; see [contracts.md](contracts.md).
