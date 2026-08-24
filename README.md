# Kitchook

Kitchook is a self-hosted cookbook built from plain Markdown recipes. Recipe content remains the durable source of truth, while Astro produces a fully static site.

## Status

Phase 0 repository bootstrap is complete. Recipe loading, schemas, search, and the full cookbook interface are planned for later phases.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the architecture and implementation roadmap.

## Prerequisites

- Node.js 24 LTS (recommended; Astro requires Node.js 22.12.0 or newer)
- npm 9.6.5 or newer

## Setup

Install the locked dependencies without running package lifecycle scripts:

```sh
npm ci --ignore-scripts
```

## Commands

```sh
npm run dev      # Start the local development server
npm run build    # Build the static site into dist/
npm run preview  # Preview the production build locally
```

## Repository layout

```text
recipes/             Canonical, framework-independent recipe content
src/pages/           Astro pages
astro.config.mjs     Astro configuration
tsconfig.json        Strict TypeScript configuration
PROJECT_PLAN.md      Architecture and phased implementation roadmap
```
