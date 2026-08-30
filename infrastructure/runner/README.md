# Dedicated KitchooK! deployment runner

This package installs a persistent, repository-scoped GitHub Actions runner as a **separate TrueNAS Custom App from Caddy**. It receives only successful `main` deployment jobs, downloads the already-built `site` artifact, and writes immutable releases under the existing KitchooK! `site/` directory.

The runner is a code-execution boundary. A workflow committed to the repository can write anything exposed to this container. Keep the repository private, protect `main` and workflow changes, and do not broaden the mounts below.

## Pinned inputs and provenance

The template uses GitHub's public official image:

```text
ghcr.io/actions/actions-runner:2.337.0
OCI index:  sha256:e5496277be5d09bc968b3d64911b74e219ac4a3f2edce956a3ecf9271bea1ef4
linux/amd64: sha256:5036480998280bb21e32ade9fe1b02b493861ac314b62ba1aea320b94f56ec97
linux/arm64: sha256:f5a0d9a3d857315f2aed7075a02a29f46927ad198221c3b1c66585ae9fe36c0d
```

These tag/digest pairs and GitHub's `actions/runner` v2.337.0 release were re-verified on 2026-08-29. The upstream release publishes SHA-256 checksums for its runner archives. The upstream Dockerfile establishes numeric user `1001`, places the unconfigured runner in `/home/runner`, and includes `curl`, `jq`, Git, and basic Ubuntu utilities. The image also contains `sudo` and a Docker CLI for broader upstream use; this template neutralizes them by selecting only `1001:1001`, dropping capabilities, enabling `no-new-privileges`, and omitting the Docker socket.

The workflow pins `actions/download-artifact` v8.0.1 to commit `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`. That release uses Node 24, verifies the server-provided artifact digest by default, and can download a named artifact from the same run without a separate token.

Do not replace an immutable digest with `latest`.

## Security and storage contract

The app has exactly three Host Path mounts:

| Container path | Access | Purpose |
| --- | --- | --- |
| `/runner` | read/write | runner software, registration, automatic updates, and diagnostics |
| `/opt/kitchook` | read-only | trusted deployment helpers copied from this package |
| `/srv/site` | read/write | KitchooK! release directories, management records, and `current` |

`/runner/_work` is a bounded nested tmpfs. A read-only job-completion hook deletes downloaded actions, artifacts, job workspaces, and runner temp files after every completed job; startup clears leftovers from an interrupted prior container, and app recreation discards the entire tmpfs as a final backstop. `/tmp` is also bounded tmpfs. Only runner software/registration/diagnostics persist in `/runner`.

The app has no published port, host network, Docker socket, privileged mode, additional capability, source checkout, recipe mount, NAS administrator credential, SSH credential, Cloudflare credential, or unrelated dataset. It needs ordinary bridge egress to GitHub and to the configured unauthenticated LAN Caddy origin.

## 1. Prerequisites

- A private GitHub repository whose default branch is `main`.
- The Phase 6 Caddy app and `site/releases` plus relative `site/current` layout.
- TrueNAS **Install via YAML** support.
- A dedicated repository runner registration token. GitHub displays this token under **Repository Settings → Actions → Runners → New self-hosted runner**; it expires after one hour.
- A direct LAN origin such as `http://192.0.2.10:15000`. Do not use the Cloudflare Access hostname: the runner stores no Access credentials.
- Outbound TCP 443 access to GitHub's required runner, action, artifact, and update endpoints. Current categories include `github.com`, `api.github.com`, `*.actions.githubusercontent.com`, `codeload.github.com`, `results-receiver.actions.githubusercontent.com`, `*.blob.core.windows.net`, `objects.githubusercontent.com`, `github-releases.githubusercontent.com`, and `release-assets.githubusercontent.com`. Re-check GitHub's self-hosted-runner communication reference before implementing a strict egress allowlist because CNAMEs can change.

## 2. Create paths and permissions

Use paths appropriate to the selected pool. The operations and runner-state paths must be separate from the Caddy configuration directory:

```text
/mnt/<pool>/apps/
├── kitchook/
│   ├── config/                 Caddy only; not mounted into the runner
│   └── site/                   runner write, Caddy read
├── kitchook-operations/        root-owned deployment scripts; runner read
└── kitchook-runner-state/      runner software/state; runner write
```

Example administrative setup (replace every path):

```sh
APP=/mnt/tank/apps/kitchook
OPS=/mnt/tank/apps/kitchook-operations
STATE=/mnt/tank/apps/kitchook-runner-state

sudo mkdir -p "$OPS/runner" "$STATE" "$APP/site"
sudo install -o root -g root -m 0555 infrastructure/release-lib.sh \
  infrastructure/publish-release.sh infrastructure/select-release.sh \
  infrastructure/adopt-release.sh infrastructure/prune-releases.sh \
  infrastructure/deploy-release.sh "$OPS/"
sudo install -o root -g root -m 0555 infrastructure/runner/entrypoint.sh \
  infrastructure/runner/job-completed.sh "$OPS/runner/"
sudo chown -R 1001:1001 "$STATE"
```

Apply the equivalent TrueNAS ACLs:

1. numeric UID/GID `1001:1001` gets Modify on runner state;
2. UID 1001 gets Modify on **only** `kitchook/site/`;
3. UID 1001 gets Read/Traverse on operations;
4. Caddy UID/GID 568 retains Read/Traverse only on `kitchook/config/` and `kitchook/site/`;
5. UID 1001 cannot write `kitchook/config/`, the `kitchook` parent, sibling apps, media, backups, or home directories; and
6. operations files remain root-owned and non-writable by UID 1001.

Do not mount a checkout as operations. Copy the reviewed helper files from a trusted `main` revision. Do not expose any of these application paths over SMB/NFS and do not disable TrueNAS Host Path safety checks.

After migration acceptance, remove the old Phase 6 interactive publisher's Modify ACL if unattended deployment fully replaces it. Retain it only if manual publication remains an explicit operating requirement.

## 3. Render and install the app

Copy [`compose.yml`](compose.yml) and replace every placeholder:

- all three `/mnt/POOL/...` Host Paths;
- `https://github.com/OWNER/REPOSITORY`;
- runner name, if desired;
- the one-hour `RUNNER_REGISTRATION_TOKEN` value; and
- `http://TRUENAS_LAN_IP:HOST_PORT` with the direct Phase 6 LAN origin.

Keep `RUNNER_LABELS: kitchook-deploy` and retention `"5"` unless the workflow is deliberately changed to the same new label/count. Review the rendered YAML: it must still have three mounts, no `ports`, and no `/var/run/docker.sock`.

In TrueNAS:

1. open **Apps → Discover Apps → ⋮ → Install via YAML**;
2. name the separate app `kitchook-deploy-runner`;
3. paste the rendered runner YAML and install;
4. inspect logs for successful registration; and
5. confirm GitHub lists one online **repository** runner with `self-hosted`, Linux/architecture, and `kitchook-deploy` labels.

The entrypoint initializes only an empty state path. It copies the image-bundled runner into `/runner` without preserving image ownership or timestamps (the root-owned dataset grants UID 1001 Modify rather than ownership), registers once, clears any prior workspace, unsets the setup token, and starts the listener. A nonempty unregistered path is rejected rather than overwritten. Keep `ACTIONS_RUNNER_HOOK_JOB_COMPLETED` pointed at the installed read-only cleanup hook so each completed job clears `_work` before another job is accepted.

### Remove the setup token immediately

After registration, edit the TrueNAS app YAML and remove the entire `RUNNER_REGISTRATION_TOKEN` line, then redeploy the app. Existing `/runner/.runner` registration does not need that token.

Confirm both boundaries:

- the updated app definition/container inspection has no registration-token environment entry; and
- from an app shell, `tr '\0' '\n' </proc/1/environ | grep RUNNER_REGISTRATION_TOKEN` produces no output.

The entrypoint unsets the variable before the listener starts even on first boot, but removing it from the app definition also removes it from stored container configuration.

## 4. Migrate the Phase 6 baseline

Inventory before deleting anything:

```sh
SITE=/mnt/tank/apps/kitchook/site
readlink "$SITE/current"
find "$SITE/releases" -mindepth 1 -maxdepth 1 -type d -print
```

Identify the selected, known-good Phase 6 baseline. Validate and enroll it without changing its files or selection, running as UID 1001 through an app shell or equivalent scoped identity:

```sh
/opt/kitchook/adopt-release.sh <baseline-release-id> /srv/site
```

The baseline becomes the first line of `/srv/site/.kitchook-deploy/releases` and counts toward five-release retention. Adoption never infers ownership from a directory name and never modifies release content.

Keep acceptance/test releases unmanaged during the first unattended deployment and rollback test. After owner-confirmed Phase 7 acceptance, explicitly delete obsolete, distinguishable Phase 6 test directories administratively. Automation never removes unmanaged directories.

## 5. First deployment and acceptance

The repository workflow targets only `[self-hosted, kitchook-deploy]` after a successful same-run `main` build. It does not check out source or install dependencies on this runner.

Push or merge a distinguishable change to `main`, then verify:

1. `validate` builds once and uploads artifact `site`;
2. `deploy` waits for the dedicated runner and passes the current-`main` stale-SHA check;
3. `site/current` equals `releases/<full-40-character-commit-sha>`;
4. the LAN origin and authenticated remote hostname serve the distinguishable content;
5. Caddy was not restarted or replaced;
6. the previous baseline remains selectable;
7. rerunning the failed deploy job safely accepts the byte-identical managed release; and
8. recreating the runner app empties `_work` while registration and `_diag` persist.

Also prove UID 1001 can write `site/` and state but cannot write Caddy config, the parent apps dataset, or any unrelated path. Confirm no pull-request job is scheduled on this runner.

## Operations

### Manual rollback

Rollback validates an existing release and uses the same atomic relative-symlink selector:

```sh
/opt/kitchook/select-release.sh <known-good-release-id> /srv/site
readlink /srv/site/current
```

Verify the direct LAN origin after selection. Rollback does not rebuild, restart Caddy, or alter release contents. A later successful deployment may prune an old managed rollback according to retention; adopt or preserve only releases that belong in the managed history.

### Retention

A healthy deployment runs:

```sh
/opt/kitchook/prune-releases.sh /srv/site 5 <just-published-id>
```

Only IDs recorded in `.kitchook-deploy/releases` are candidates. Pruning keeps at most five managed releases, always protects `current` and the explicit just-published ID, and ignores every unmanaged directory. Cleanup occurs only after byte-for-byte LAN verification. Cleanup failure is logged as a warning and does not roll back a healthy release.

### Safe retry and interrupted publication

`publish-release.sh` never overwrites a release. A retry succeeds only when:

- the release is recorded as automation-managed (or has an exact pending transaction marker);
- required files remain valid and contain no symlinks; and
- the existing release is byte-for-byte equivalent to the downloaded artifact.

An unmanaged collision, changed artifact, missing managed directory, malformed `current`, or stale fixed staging directory fails closed. Inspect `.kitchook-deploy/pending/`, `.kitchook-deploy/pruning/`, and hidden `releases/.*.staging` paths before correcting a stale transaction. Never delete `current` or a selected release to silence an error.

A stale `.kitchook-deploy/deploy.lock` means a job was killed without normal cleanup. Confirm no deployment process or queued job is active before removing only that empty lock directory.

### Runner/image upgrades

The persistent runner uses GitHub's default automatic updates; no runtime PAT is stored. Updates write to `/runner`, not the read-only image filesystem. GitHub may stop assigning jobs to an outdated runner, especially for a critical update.

Periodically pin a newer official base image as well:

1. review the latest `actions/runner` release and upstream Dockerfile;
2. verify the version tag resolves to the recorded multi-platform digest and architecture child;
3. update both readable tag and digest in `compose.yml`;
4. update the provenance block in this README;
5. render/review the three mounts and hardening again;
6. replace the app without adding a registration token; and
7. confirm the existing registration returns online and accepts a test deployment.

The pinned base controls initialization of a fresh state path; automatic updates keep the persistent active copy within GitHub's support window.

When deployment helper files change, checksum the reviewed repository copies, reinstall them root-owned into the operations path, and recreate the runner app. Do not let a workflow update its own read-only operations mount.

### Failure recovery

- **Offline/queued:** GitHub queues the labeled job; it does not fall back to a GitHub-hosted or differently labeled machine. Check app health, registration status, time, DNS, and outbound HTTPS.
- **Registration collision:** choose a unique runner name or remove the stale offline runner in repository settings. Do not use `--replace` to take over an unexplained registration.
- **Nonempty unregistered state:** preserve `_diag`, inspect the path, then either restore its `.runner` registration files or empty the dedicated state path before one-time registration.
- **Artifact failure:** required files and symlink checks occur before switching `current`.
- **Origin failure:** deployment restores and byte-verifies the previous selection when one exists; pruning is skipped.
- **Retention warning:** production is already verified. Diagnose permissions, transaction markers, and managed history separately.
- **Lost app:** recreate it from reviewed YAML. State, releases, metadata, and Caddy remain independent Host Paths.

### De-registration and retirement

1. Stop the runner app and confirm it is offline.
2. Remove the repository-scoped runner in **Repository Settings → Actions → Runners** so GitHub invalidates its registration.
3. Preserve `_diag` only as long as operational policy requires, then securely remove the dedicated runner-state contents.
4. Remove the app, UID 1001 site ACL, operations directory, and state path if no other repository uses them.
5. Do not remove Caddy's read-only site mount or production releases as part of runner retirement.

## Reusing this package for another KitchooK! repository

Create separate state, operations, and site paths; use a separate repository-scoped registration and unique runner name; and use a dedicated label in both Compose and that repository's workflow. Replace its origin URL and retention count. Never share one persistent runner or writable site mount across unrelated repositories. Copy only the generic operational scripts/template—do not mount either source checkout.
