# Changelog

All notable user-visible changes to KitchooK! are documented here. The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); see [`docs/releases.md`](docs/releases.md) for compatibility and release policy.

## Unreleased

## 0.1.4 — 2026-09-01

### Added

- Public contribution, security-reporting, ownership, and issue-management controls.
- Three additional published example recipes and AI-generated imagery for every active bundled recipe.

### Changed

- Refreshed public build, deployment, and operator documentation after launch and documented the generated `404.html` output.

### Fixed

- Kept the yellow 404 panel text dark and readable in dark mode.

## 0.1.3 — 2026-08-31

### Added

- Static `404.html` output for cookbook deployments.
- Cloudflare Pages deployment workflows for `kitchook.com` and `demo.kitchook.com`.
- Immutable cache guidance and headers for fingerprinted Astro assets.

### Fixed

- Mobile documentation menu alignment and sizing.

## 0.1.2 — 2026-08-31

### Added

- The independent `website/` package with the branded landing page and Starlight documentation.
- Public website and demo build/deployment infrastructure.
- Documentation for the completed private owner-instance migration and upgrade rehearsal.

## 0.1.1 — 2026-08-31

### Added

- Public distribution documentation for source, OCI, static-server, S3/CloudFront, GitHub Actions, and advanced TrueNAS deployments.
- Private-instance migration and public/private automation boundaries.

### Changed

- Builder release dependencies and actions were updated for the supported Node.js runtime.

## 0.1.0 — 2026-08-30

### Added

- Initial distributable KitchooK! source release.
- Versioned multi-platform OCI builder for `linux/amd64` and `linux/arm64`.
- External cookbook input, validated instance configuration, and portable static-output contracts.

[Unreleased]: https://github.com/Refueled/kitchook/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/Refueled/kitchook/releases/tag/v0.1.4
[0.1.3]: https://github.com/Refueled/kitchook/releases/tag/v0.1.3
[0.1.2]: https://github.com/Refueled/kitchook/releases/tag/v0.1.2
[0.1.1]: https://github.com/Refueled/kitchook/releases/tag/v0.1.1
[0.1.0]: https://github.com/Refueled/kitchook/releases/tag/v0.1.0
