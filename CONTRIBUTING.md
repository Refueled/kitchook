# Contributing to KitchooK!

Thanks for helping improve KitchooK!. Bug reports, documentation fixes, tests, and focused code changes are welcome.

## Before you start

- Search existing issues before opening a new one.
- Use GitHub Private Vulnerability Reporting for security problems; do not open a public issue. See [SECURITY.md](SECURITY.md).
- Open an issue before investing in a large feature or a change to a documented input, output, or compatibility contract.
- Keep personal recipes, credentials, hostnames, and infrastructure details out of contributions.

## Development setup

Use Node.js 24 LTS (Node.js 22.12 or newer is supported) and npm 9.6.5 or newer.

```sh
git clone https://github.com/Refueled/kitchook.git
cd kitchook
npm ci --ignore-scripts
npm test
npm run build
```

To work on the documentation website:

```sh
cd website
npm ci --ignore-scripts
npm run check
npm run build
```

Dependency installs must always disable lifecycle scripts explicitly. Do not add or document a bare `npm install`, `npm i`, or `npm ci` command. When intentionally changing a dependency, pin its version exactly, review its provenance and lifecycle scripts, update the lockfile with scripts disabled, perform a clean locked install, and run `npm audit`.

## Making a change

1. Create a branch from `main`.
2. Make one focused change with tests or documentation where appropriate.
3. Preserve the contracts in [`docs/contracts.md`](docs/contracts.md). Discuss breaking changes before implementing them.
4. Run the applicable checks from a clean locked dependency installation.
5. Open a pull request and complete the template.

For recipe fixtures, use original, redistributable content only. Do not submit copied recipe prose or media without clear permission and attribution compatible with this repository's license.

## Pull-request checks

The required CI jobs run entirely on GitHub-hosted runners and:

- test and build the cookbook;
- build and exercise the OCI builder with valid and malformed fixtures; and
- check and build the documentation website.

Deployment and release credentials are not available to pull requests. Maintainers review changes to workflows, dependencies, the builder, and deployment infrastructure.

## Style and scope

- Prefer direct, static-build-time solutions over runtime services.
- Keep Markdown recipes useful independently of KitchooK!.
- Avoid unrelated formatting or refactoring in a focused pull request.
- Update user documentation when behavior changes.
- Add an entry under **Unreleased** in [`CHANGELOG.md`](CHANGELOG.md) for user-visible changes.

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
