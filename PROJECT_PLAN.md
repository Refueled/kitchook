# KitchooK! Distribution and Public Launch Plan

> **Status:** Complete (2026-09-01)
>
> **Created:** 2026-08-30
>
> **Primary audience:** Project owner, maintainers, and coding/automation agents
>
> **Purpose:** Turn the completed personal KitchooK! implementation into a safely distributable open-source static-site builder, move the owner's recipes and deployment into a private instance, and launch public documentation at `kitchook.com`.

---

## 1. Background

The original architecture and personal-instance implementation are complete through automated deployment. Their durable decisions now live in the current contracts, brand guidance, tests, and infrastructure runbooks. The superseded planning documents were removed from the active tree and remain available in Git history.

The current product already has the correct technical foundation for distribution:

- recipes remain ordinary Markdown with colocated images;
- Astro validates the content and generates a static site;
- search and the recipe API are static build artifacts;
- the generated `dist/` directory can be served by any suitable static host;
- Caddy and TrueNAS are deployment choices rather than application requirements; and
- the dedicated runner only publishes a completed artifact and is not part of the cookbook runtime.

The public repository contains eight intentional example recipes: six active, one draft, and one archived. Their active-recipe imagery was generated for KitchooK! and is documented for redistribution. Personal content and deployment control remain in the separate private owner-instance repository.

---

## Current handoff status

**Completed:** Phases 0 through 6. The source repository and documentation launched publicly on 2026-09-01.

- The public repository now has contribution and security policies, issue and pull-request templates, `CODEOWNERS`, required GitHub-hosted checks and owner review, restricted SHA-pinned Actions, secret scanning with push protection, public metadata, and GitHub Private Vulnerability Reporting.
- The current public builder release is [`v0.1.3`](docs/releases.md), published at `ghcr.io/refueled/kitchook:0.1.3@sha256:ea97b19f4634941eacbe83a05324f6497dc577cc48736b939fc696d08eac278b`. The GHCR package is publicly readable and was consumed successfully by a disposable private clean-room repository on a fresh GitHub-hosted runner.
- The private owner instance deliberately remains pinned to `v0.1.2`; its upgrade built, published, and origin-verified the same-run artifact under immutable release ID `8fdf888ce042f8acee4da681c2173ea1f5fb007a`. The selected production artifact remains independent of either repository.
- `kitchook.com` and `demo.kitchook.com` are public Cloudflare Pages artifacts deployed only from GitHub-hosted runners. Public validation covered homepage, quick start, recipe route, search, API, 404, immutable fingerprinted-asset caching, HTTPS, and the `www`-to-apex redirect.
- Phase 4 documentation has been exercised through source and OCI builds, ordinary static hosting, Caddy, and private S3/CloudFront. The S3/CloudFront guide requires the documented viewer-request directory-index function and restricted missing-object lookup permission; these are not optional when using a private S3 REST origin.
- No roadmap acceptance work remains. The GitHub social preview uses `website/public/social-card.png`, and the redundant repository wiki is disabled so the documentation site and tracked Markdown remain authoritative.

---

## 2. Product Goal

KitchooK! should be installable according to one simple contract:

> Supply a compatible recipe collection, run a versioned KitchooK! build, and receive a portable static site.

A user must be able to:

1. author recipes as Markdown and images;
2. validate and build them locally or in automation;
3. serve the generated files with an ordinary static web server; and
4. upgrade KitchooK! independently from their private content.

Git, GitHub Actions, Caddy, Docker, TrueNAS, and S3 may support that workflow, but none is universally required.

---

## 3. Durable Architectural Rules

The distribution work must preserve these rules:

1. **Markdown is canonical.** Recipes must remain useful without KitchooK!, Astro, a database, or a hosted service.
2. **Build-time work is preferred.** Validation, rendering, image processing, routes, search, and JSON export remain build-time operations.
3. **The production artifact is static.** A deployed cookbook must not require a Node.js server, application backend, database, or content service.
4. **Content is private by default.** Public software must not require users to publish their recipes or place them in a public fork.
5. **Application and content versions are independent.** A recipe change must not require an application release, and an application upgrade must not require copying recipes into the public repository.
6. **Deployment is replaceable.** KitchooK! produces files; users choose how to host them.
7. **Public contributions never execute on the owner's self-hosted runner.** The production deployment boundary belongs to the private instance repository.
8. **Generated output is disposable.** `dist/`, search indexes, API JSON, optimized images, and web-server containers are reproducible views over source content.

---

## 4. Target Architecture

```text
                         PUBLIC SOFTWARE
              ┌──────────────────────────────┐
              │ KitchooK! source repository │
              │ application + examples      │
              │ tests + builder + templates │
              └──────────────┬───────────────┘
                             │ versioned release
                             ▼
              ┌──────────────────────────────┐
              │ KitchooK! builder           │
              │ source release and OCI image│
              └──────────────┬───────────────┘
                             │
                recipes + instance config
                             │
                             ▼
              ┌──────────────────────────────┐
              │ Static build                │
              │ HTML / assets / search / API│
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ Any static host             │
              │ Caddy / nginx / S3 / etc.   │
              └──────────────────────────────┘

                         OWNER INSTANCE
              ┌──────────────────────────────┐
              │ Private instance repository │
              │ recipes + config + deploy   │
              └──────────────┬───────────────┘
                             │ generated site artifact
                             ▼
              ┌──────────────────────────────┐
              │ Repository-scoped runner    │
              │ TrueNAS release publication │
              └──────────────┬───────────────┘
                             ▼
                        Existing Caddy
```

### 4.1 Public application repository

This repository will contain:

- Astro application source;
- recipe schema and publication logic;
- search and JSON export contracts;
- automated tests and artifact verification;
- intentional example recipes;
- builder packaging;
- generic deployment templates;
- contributor and security documentation;
- the `kitchook.com` source unless a later operational need justifies a separate repository; and
- the advanced TrueNAS/Caddy deployment package as one supported option.

It will not contain:

- the owner's future personal recipes;
- credentials or instance secrets;
- the owner's active production deployment workflow;
- a registered self-hosted runner target; or
- writable access to the owner's production storage.

### 4.2 Private owner-instance repository

A separate private repository will contain:

- the owner's recipe collection and images;
- instance configuration;
- the pinned KitchooK! builder version or digest;
- the workflow that builds the owner's cookbook;
- the production deployment job targeting the repository-scoped runner; and
- instance-specific operational notes that are inappropriate for public documentation.

Application upgrades will be deliberate builder-version updates in this repository. Recipe commits will not be merged into the public software repository.

### 4.3 Public website

`kitchook.com` will be a separate static build artifact from every cookbook. It will provide:

- a branded landing page;
- a live example using the public recipes;
- a concise quick start;
- Starlight-based documentation;
- deployment guides; and
- links to source, releases, security policy, and contribution guidance.

The website may live under `website/` in this repository with an independent package and lockfile. It must not become a runtime dependency of generated cookbooks.

---

## 5. Distribution Contract

### 5.1 Recipe input

The supported input remains:

```text
recipes/
└── <lowercase-kebab-case-slug>/
    ├── recipe.md
    └── <optional colocated images>
```

The existing schema, status behavior, Markdown conventions, and image validation remain authoritative. A distributable build must require at least one active recipe unless empty-cookbook support is explicitly designed later.

The builder may stage or mount recipes internally, but users must not need to modify framework source files to provide content.

### 5.2 Instance configuration

A small, validated instance configuration should replace distributable hard-coded values where customization is useful. The first contract should remain intentionally narrow:

- site title/wordmark text;
- site description;
- optional canonical origin;
- optional deployment identifier behavior; and
- other values proven necessary by generic deployment testing.

Defaults must preserve the current KitchooK! experience. Recipe schema concerns do not belong in instance configuration.

Hosting at an origin root is the initial supported contract. Subpath hosting such as `example.com/kitchook/` is deferred until every route, asset, search result, API URL, and browser interaction can be tested under a non-root base path.

### 5.3 Static output

The output root must directly contain at least:

```text
index.html
recipes/
search/index.json
api/recipes.json
_astro/
```

The output is portable and may be copied to any static host capable of serving directory indexes and ordinary files. The host must not need access to source Markdown.

### 5.4 Builder interfaces

Two supported build paths are planned:

1. **Source checkout:** locked Node dependencies followed by the existing test/build commands.
2. **Versioned OCI builder:** mounted recipe/config input and a generated output directory, with no dependency installation required by the user at execution time.

The npm project will remain private from the npm registry unless publishing a package later has a demonstrated benefit. Public source and a public builder image are sufficient for the initial distribution.

### 5.5 Upgrade contract

- KitchooK! releases use semantic versions.
- Builder releases identify the corresponding source revision.
- Instance repositories pin a release version and preferably an immutable image digest.
- Schema or output-contract breaking changes require an explicit migration and major-version decision.
- The existing recipe JSON compatibility policy remains additive unless explicitly revised.

---

## 6. Supported Deployment Profiles

Documentation will distinguish build and hosting rather than presenting one universal stack.

### Profile A — Local build and ordinary web server

The user builds on a workstation or server and copies `dist/` to Caddy, nginx, Apache, or another static document root. Git and automation are optional after obtaining the source.

### Profile B — One-shot container build

The user mounts recipes and an output location into the versioned builder image, then serves the output with their chosen web server. The builder is not an always-running application.

### Profile C — Hosted static files

The user uploads generated `dist/` contents to S3/CloudFront, Cloudflare Pages, Netlify, or an equivalent static platform. Raw Markdown is not fetched by the browser.

### Profile D — GitHub-hosted build automation

A private recipe repository runs the build on GitHub-hosted infrastructure and publishes or transfers the resulting artifact. A self-hosted runner is not required unless the destination requires one.

### Profile E — Hardened TrueNAS deployment

The current immutable-release, Caddy, repository-scoped runner, verification, rollback, and retention architecture remains the advanced owner-tested profile. It will be generalized only where doing so does not weaken its security boundaries.

---

## 7. Explicit Non-Goals

This roadmap does not add:

- runtime Markdown loading from S3;
- a runtime Astro/Node server;
- a database or CMS;
- user accounts or multi-tenant hosting;
- a web recipe editor;
- automatic synchronization between unrelated recipe repositories;
- a requirement to use Git or GitHub Actions;
- a single deployment abstraction covering every hosting provider;
- arbitrary plugins executed from untrusted recipe collections;
- automatic application upgrades in private instances; or
- npm registry publication without a concrete consumer need.

---

## 8. Security and Publication Boundaries

Before public launch:

1. Public pull requests and branches must run only on GitHub-hosted runners.
2. The self-hosted deployment runner must be removed from this repository and registered only to the private instance repository.
3. Public workflow permissions must remain least-privilege and official actions must remain commit-pinned.
4. Workflow and release infrastructure changes must require owner review through branch protection and `CODEOWNERS`.
5. Repository history and tracked files must be reviewed for secrets, private infrastructure details, and unintended personal data.
6. Example recipe text and images must have confirmed redistribution rights; the MIT software license does not automatically license third-party content.
7. Builder base images, package dependencies, lifecycle scripts, and lockfile changes must receive supply-chain review before release.
8. npm dependency installation in code, automation, containers, and documentation must explicitly disable lifecycle scripts.
9. The public builder must not contain instance credentials, private recipes, runner registration, or production host information.
10. Generated cookbooks remain the operator's responsibility to protect if exposed outside a trusted network.

---

# 9. Implementation Phases

## Phase 0 — Retire the personal-instance plans

**Status: Complete (2026-08-30; archived plans removed after documentation review).**

Deliverables:

- carry durable architecture decisions into code-adjacent documentation and tests;
- retain the live deployment procedure in the infrastructure runbooks;
- make this document the active `PROJECT_PLAN.md`; and
- remove superseded planning documents from the active tree once implementation is complete.

Acceptance:

- current contracts and runbooks describe the implemented behavior;
- historical planning remains available in Git history;
- the root plan describes only the current distribution/public-launch roadmap; and
- repository references to the active plan remain valid.

---

## Phase 1 — Formalize the reusable application boundary

**Status: Complete.**

Deliverables:

- document the recipe input, instance configuration, and static output contracts in code-adjacent documentation;
- add and validate the minimum instance configuration needed to remove inappropriate hard-coded deployment values;
- preserve current defaults and visual identity;
- ensure build verification works with arbitrary valid recipe slugs rather than requiring a named example route;
- add fixture coverage for a non-example recipe collection;
- identify and separate generic infrastructure from owner-instance assumptions;
- establish root-origin hosting as the supported initial URL contract; and
- document how application versions may evolve without owning user content.

Acceptance:

- an alternate valid recipe collection can build without modifying `src/`;
- generated routes, search, JSON export, and images all derive from that alternate collection;
- the default example build remains visually and behaviorally unchanged;
- invalid configuration fails with a useful build error; and
- tests do not confuse example recipe identities with required product behavior.

---

## Phase 2 — Produce a versioned builder and release process

**Status: Complete (initial `v0.1.0`; current release `v0.1.3`).**

Deliverables:

- a reviewed builder container definition;
- explicit read-only recipe/config inputs and a dedicated output contract;
- no dependency installation during ordinary builder execution;
- clean locked dependency installation with lifecycle scripts disabled during image construction;
- pinned and provenance-documented base images;
- support for the deployment architectures selected during implementation, with AMD64 and ARM64 preferred;
- OCI image publication from tag/release automation on GitHub-hosted runners;
- semantic source releases and release notes;
- structural verification of builder output; and
- documented version and digest pinning for consumers.

Acceptance:

- a user can build the examples through the source interface and builder interface;
- a mounted alternate recipe collection produces a valid static artifact;
- malformed recipes fail the container build without publishing partial output;
- generated homepage, recipe routes, search index, and API export pass existing verification;
- the image contains no private content or production credentials; and
- the release can be reproduced from its documented source revision and locked dependencies.

### Phase 2 integration record

Phase 2 implementation remained off `main` while this repository still targeted the owner's runner. The `v0.1.0` tag published the builder from the verified Phase 2 commit through the GitHub-hosted-only release workflow, allowing the private instance to pin its digest before migration. After Phase 3 moved and re-scoped the runner, the builder work merged to `main`; the public workflow now has no production-targeting job.

---

## Phase 3 — Split and migrate the owner instance

**Status: Complete.**

This phase must complete before the public repository accepts untrusted contributions.

Deliverables:

- create a private owner-instance repository;
- move/copy the example collection there as the initial deployment content, followed by future personal recipes only after the boundary is proven;
- add instance configuration and a pinned builder version/digest;
- move production build/deploy automation into the private repository;
- retain GitHub-hosted testing/building and use the self-hosted runner only for final publication;
- remove the production deploy job and self-hosted label from this public application repository;
- unregister the runner from this repository and register it to the private instance repository;
- preserve the existing installed, read-only deployment operations and Caddy dataset boundaries; and
- document the owner upgrade procedure.

Acceptance:

- a private-instance recipe commit builds and deploys without changing the public repository;
- a KitchooK! upgrade is performed by changing a pinned application/builder version in the private repository;
- deployment still uses the same-run artifact, full release identifier, byte verification, rollback, and retention behavior;
- Caddy serves the migrated artifact without requiring a new runtime architecture;
- the public repository has no job capable of targeting the owner's runner; and
- disabling or deleting either repository does not destroy the selected static production release.

### Phase 3 builder-pin upgrade rehearsal

The owner instance upgraded its sole builder pin from `v0.1.0` to the newly released `v0.1.1` image and matching immutable digest. GitHub-hosted validation built the private collection with that pin; the repository-scoped runner deployed the same-run artifact under full release ID `e0e057efb9073f4228e5b789a3e33ef4e7af4e1b` and completed its direct-origin verification. The prior selected immutable release `2026c4f0f1e763b97bad2932f5b7c42c1193547b` was then selected and byte-verified through Caddy before selection returned to `e0e057efb9073f4228e5b789a3e33ef4e7af4e1b` and was byte-verified again. No rebuild or Caddy restart was required for either release selection.

---

## Phase 4 — Write and test distribution documentation

**Status: Complete.**

Deliverables:

- a concise root README quick start;
- recipe authoring and schema documentation;
- local source-build instructions;
- builder-container instructions;
- generic static web-server guidance;
- generated-`dist/` S3/CloudFront guidance;
- GitHub-hosted automation examples that do not assume TrueNAS;
- version upgrade and rollback guidance;
- troubleshooting for validation, routes, permissions, and caching;
- an explicitly advanced TrueNAS path linking to the existing hardened runbooks; and
- a tested statement of what KitchooK! does not support, including runtime raw-Markdown loading.

Acceptance:

- a clean-room test can go from example content to a served static site using only public documentation;
- at least one no-Docker and one containerized build path pass;
- at least two static-host profiles are exercised;
- every dependency-install command explicitly disables lifecycle scripts;
- examples contain placeholders rather than owner-specific paths, addresses, repositories, or credentials; and
- the documentation clearly separates building from hosting.

### Phase 4 validation record

Documentation validation passed locally: the source build completed with the bundled examples; the OCI builder produced the alternate-cookbook fixture through its documented named-volume path; and the resulting artifact was served and checked through both an ordinary static-file server and the documented Caddy profile, including route, search/API, 404, and cache-header checks. A project-controlled S3/CloudFront validation also passed with a private OAC bucket, directory-index viewer-request function, restricted missing-object lookup permission, HTTPS redirect, cache policies, invalidation, and end-to-end homepage/route/search/API/404 verification. Finally, a disposable private recipe repository ran the documented public, digest-pinned OCI builder on a fresh GitHub-hosted runner; its uploaded artifact was deployed to the validation distribution and verified through CloudFront with the clean-room homepage, route, search/API, and 404 checks.

---

## Phase 5 — Build `kitchook.com`

**Status: Complete.**

Deliverables:

- an Astro website package isolated from cookbook artifacts;
- a custom branded landing page;
- Starlight documentation with clear navigation and search;
- responsive screenshots or a live example generated from public recipes;
- quick-start, authoring, configuration, deployment, upgrading, security, and contribution sections;
- source/release links and appropriate metadata/social cards;
- an independent static deployment pipeline using only GitHub-hosted infrastructure; and
- domain, HTTPS, cache, redirect, and failure-recovery documentation.

Acceptance:

- `kitchook.com` explains the product and reaches a working quick start immediately;
- documentation remains usable without the marketing page's decorative JavaScript;
- the live example contains only public example content;
- website deployment cannot access the owner's cookbook runner or storage;
- broken links and production builds are checked in CI; and
- cookbook releases do not require redeploying the documentation site unless documentation changed.

### Phase 5 validation record

Cloudflare Pages Direct Upload projects now publish the independently built website at `kitchook.com` and the public-example cookbook at `demo.kitchook.com`. The GitHub-hosted-only workflows uploaded both artifacts successfully using narrowly scoped Pages credentials; neither workflow can access the owner runner or storage. Live validation passed for the website homepage and quick start, demo homepage, route, search index, JSON API, 404 behavior, HTTPS, fingerprinted-asset cache policy, and permanent `www.kitchook.com` to `kitchook.com` redirect with path/query preservation. The cookbook build now emits `404.html`, and committed `_headers` files set immutable caching only for fingerprinted `/_astro/` assets.

---

## Phase 6 — Public-project hardening and launch

**Status: Complete (2026-09-01).**

Deliverables:

- `CONTRIBUTING.md`;
- `SECURITY.md` with a private reporting route;
- `CODEOWNERS` for workflows, dependencies, builder, and deployment infrastructure;
- issue and pull-request templates;
- changelog and release policy;
- repository topics, description, screenshots, and social preview;
- branch protection and required checks;
- final secret/history/provenance/content-license review;
- first supported semantic release and builder image;
- public repository visibility; and
- launch documentation at `kitchook.com`.

Acceptance:

- an external user can discover, build, deploy, and upgrade KitchooK! without access to owner-only instructions;
- an external contributor can run tests and submit a pull request;
- no public pull request can schedule work on private infrastructure;
- all public example assets are redistributable;
- release artifacts, image tags/digests, and source revisions correspond;
- the owner's private instance continues deploying independently; and
- disaster recovery remains possible from private recipes, a pinned public release, and the existing static-host configuration.

### Phase 6 validation record

The repository is publicly readable and clonable without authentication. Contribution controls, required GitHub-hosted checks, owner review, SHA-pinned approved Actions, least-privilege workflow permissions, secret scanning with push protection, and GitHub Private Vulnerability Reporting are active. Public checks confirmed the security policy, `v0.1.3` source release, matching GHCR manifest digest and architectures, six-recipe live demo, and clean secret-scanning and dependency-alert results. Example imagery was replaced with AI-generated project assets and its redistribution status is documented in `recipes/README.md`. The owner accepted retaining historical commit author metadata rather than invalidating published release tags, OCI provenance, and source revisions. Repository metadata, topics, and the custom social preview are set; the redundant GitHub wiki is disabled.

---

## 10. Testing Strategy

Distribution changes require more than preserving the existing unit tests.

### Application tests

Continue testing:

- recipe schema and publication status;
- Markdown normalization;
- search ranking and filters;
- JSON export compatibility;
- generated route/index/API agreement;
- deployment release safety; and
- static behavior without client JavaScript where promised.

### Distribution fixtures

Add isolated fixtures for:

- a minimal valid cookbook;
- custom instance configuration;
- images and image validation;
- draft/archived exclusion;
- malformed content and malformed configuration;
- arbitrary slugs unrelated to bundled examples; and
- paths containing spaces where supported.

### Builder tests

Verify:

- input mounts are not modified;
- output is complete before publication;
- repeat builds do not depend on prior output;
- builder failures are nonzero and comprehensible;
- the image runs as a non-root identity where practical;
- no secret or private content enters image layers; and
- supported architectures produce equivalent contracts.

### Documentation acceptance

Every documented installation path must be followed from a clean environment before being called supported. Commands must be copied exactly, not mentally corrected during testing.

### Migration acceptance

The owner's production migration must verify:

- repository and runner scoping;
- selected release identity;
- homepage/search/API bytes;
- authenticated remote access;
- safe retry;
- rollback;
- workspace cleanup; and
- continued Caddy read-only behavior.

---

## 11. Documentation Information Architecture

The public documentation should converge on this structure:

```text
Introduction
├── What KitchooK! is
├── How static generation works
└── Quick start

Authoring
├── Recipe directory structure
├── Frontmatter reference
├── Markdown conventions
├── Images
└── Drafts and archives

Building
├── Local source build
├── Builder container
├── Configuration
└── Build troubleshooting

Deploying
├── Any static web server
├── Caddy / Docker Compose
├── S3 / CloudFront
├── GitHub Actions
└── TrueNAS advanced deployment

Operating
├── Upgrades
├── Backups
├── Caching
├── Security and remote access
└── Recovery and rollback

Project
├── Architecture
├── JSON export contract
├── Contributing
├── Security policy
└── Releases and compatibility
```

Provider-specific guides must not obscure the universal rule: build a static artifact, then host its files.

---

## 12. Migration and Launch Order

The intended order is:

1. complete Phase 1 while the repository remains private and production remains unchanged;
2. implement and validate the builder/release contract;
3. create and test the private instance repository;
4. move and re-register the production runner;
5. prove private-instance deployment and rollback;
6. remove all owner production targeting from the application repository;
7. complete generic documentation and public-project controls;
8. make the application repository public;
9. publish the first supported release and builder;
10. launch `kitchook.com`; and
11. begin importing personal recipes only into the private instance repository.

If builder publication requires temporary sequencing changes, Caddy may continue serving its already-selected static release while automation is offline. Do not preserve convenience by exposing the production runner to the public repository.

---

## 13. Decisions to Resolve During Implementation

These decisions are intentionally bounded and must be recorded before their relevant phase is accepted:

1. **Resolved (Phase 3):** the owner-instance repository name and location remain in private operational records; the public contract does not depend on or disclose them.
2. **Resolved (Phase 2):** `ghcr.io/refueled/kitchook`, publishing `linux/amd64` and `linux/arm64`.
3. **Resolved (Phase 2):** `0.1.0` is the initial distribution release.
4. **Resolved (Phase 1):** `instance.config.json` at the selected content-directory root; required non-blank `title` and `description`, plus optional origin-only `canonicalOrigin`. The content directory contains both this file and `recipes/` and is selected with `KITCHOOK_CONTENT_DIR` (default: repository root). Deployment identifiers remain deployment metadata.
5. **Resolved (Phase 5):** `website/` remains an independent package in this repository; no operational need justified a separate repository.
6. **Resolved (Phase 5):** Cloudflare Pages hosts `kitchook.com` through GitHub-hosted Direct Upload automation.
7. **Resolved (Phase 5):** the live public example uses the `demo.kitchook.com` subdomain.
8. **Resolved (Phase 1):** cookbook hosting remains root-origin-only; subpath support is deferred to a future compatibility release if it can satisfy every route, asset, search, API, and browser-interaction contract.

These are not invitations to revisit the static-first architecture.

---

## 14. Definition of Done

This roadmap is complete when:

- the software repository is public and contains only public software/example content;
- the owner's recipes and deployment control plane are private and independently operable;
- a versioned builder turns external recipes into the documented static output;
- users can choose a static host without adopting TrueNAS or GitHub Actions;
- generic and advanced deployment paths have been clean-room tested;
- public contributions cannot execute on owner infrastructure;
- semantic releases and upgrades have a documented compatibility policy;
- `kitchook.com` provides a polished landing page and complete documentation; and
- the original architectural principle still holds:

> The Markdown recipe collection is the durable product. KitchooK! is a replaceable, reproducible view over that content.
