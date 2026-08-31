# syntax=docker/dockerfile:1
# Official Node image, tag 24.12.0-bookworm-slim.
# The digest identifies its reviewed multi-platform OCI index (linux/amd64 and linux/arm64).
FROM node:24.12.0-bookworm-slim@sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99 AS base

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
# Locked installation only; lifecycle scripts are intentionally disabled.
RUN npm ci --ignore-scripts

FROM base AS builder
ARG VERSION=0.1.0
ARG REVISION=unknown
LABEL org.opencontainers.image.title="KitchooK! builder" \
      org.opencontainers.image.description="Build Markdown recipe collections into static KitchooK! sites." \
      org.opencontainers.image.source="https://github.com/Refueled/kitchook" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1 \
    HOME=/tmp/home \
    NPM_CONFIG_CACHE=/tmp/npm
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
COPY --chown=node:node infrastructure/builder/entrypoint.sh /usr/local/bin/kitchook-build
RUN chmod 0555 /usr/local/bin/kitchook-build && chown node:node /app

# The builder only needs read access to application code and executes as the
# unprivileged identity provided by the official Node image.
USER node
ENTRYPOINT ["/usr/local/bin/kitchook-build"]
CMD ["/input", "/output"]
