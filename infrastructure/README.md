# TrueNAS static serving and automated deployment

> **Validation status:** Static serving and dedicated-runner deployment passed live acceptance on TrueNAS 25.04.2.6.

This package serves KitchooK! as static files on TrueNAS Community Edition 25.04.2.6 and publishes successful `main` builds through a separate, repository-scoped runner app. Caddy runs as numeric non-root user `568:568`, listens on HTTP port 8080 inside a bridge-network container, and sees the generated site and its own configuration through read-only bind mounts. TrueNAS publishes one operator-selected host port. The deployment runner is isolated from Caddy and receives write access only to `site/` plus its own state.

Default installation is LAN-only. The live deployment additionally uses a Cloudflare Tunnel and a self-hosted Cloudflare Access application restricted to the owner's identity. Never create a public route without tested, fail-closed authentication, and never create a router port-forward.

## Files and fixed contract

- [`Caddyfile`](Caddyfile) serves `/srv/current` with no SPA fallback and no directory listing.
- [`compose.yml`](compose.yml) is the TrueNAS **Install via YAML** template.
- [`publish-release.sh`](publish-release.sh) stages, records, and selects immutable managed releases with safe matching retries.
- [`select-release.sh`](select-release.sh) performs validated atomic rollback/selection.
- [`adopt-release.sh`](adopt-release.sh) explicitly enrolls a known-good pre-automation release.
- [`prune-releases.sh`](prune-releases.sh) retains only the configured number of explicitly managed releases.
- [`deploy-release.sh`](deploy-release.sh) publishes, verifies the direct LAN origin byte-for-byte, restores the prior selection on failure, and then prunes.
- [`runner/`](runner/) contains the hardened, reusable TrueNAS Custom App runner package and its complete provisioning runbook.
- The image is the Docker Official Image `caddy:2.11.4-alpine`, pinned to multi-platform digest `sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648`. Docker Hub reported AMD64 child digest `sha256:98eb57d882ccd5213d1688764db10c1ca2c58a1ca3a6717a3411ad798f7a423a` when this package was implemented. Re-check both before a future intentional image update.

The host layout is:

```text
/mnt/<pool>/apps/kitchook/       dedicated Host Path dataset
├── config/
│   └── Caddyfile
└── site/
    ├── .kitchook-deploy/
    │   ├── releases             ordered managed-release records
    │   ├── pending/             interrupted-publication ownership markers
    │   └── pruning/             interrupted-retention markers
    ├── releases/
    │   ├── <commit-sha>/
    │   └── <older-commit-sha>/
    └── current -> releases/<commit-sha>
```

Caddy mounts the parent `site/` directory at `/srv`, not the resolved target of `current`. A later atomic symlink switch is therefore visible without remounting or restarting Caddy.

## 1. Confirm the host and create the datasets

In **System Settings → General**, confirm the installed release is TrueNAS Community Edition **25.04.2.6**. If the live version differs, compare its Custom App behavior with the version-specific TrueNAS documentation before continuing.

### Which dataset preset to use

The **Apps** preset is the correct TrueNAS preset for the `kitchook` application-data dataset. TrueNAS 25.04 documents that it configures:

- NFSv4 ACLs in Passthrough mode;
- case-sensitive names;
- access-time updates off; and
- an inheritable **Modify** ACL entry for group 568 (`apps`).

That last item is convenient for applications that write their own data, but this Caddy container should only read. Use the Apps preset for its storage settings, then reduce the group 568 entry to **Read** after seeding the files. Compose independently enforces a read-only bind mount, so Caddy still cannot write if the host ACL is accidentally left at the preset default during the first test.

### Recommended hierarchy under a parent dataset

Use a normal, visible parent dataset for organization; do not use the hidden, system-managed `ix-apps` dataset:

```text
<pool>/apps/                    visible organizational parent dataset
└── kitchook/                   dedicated application-data dataset
    ├── config/                 ordinary directory
    └── site/                   ordinary directory
```

Create it in the UI:

1. Open **Datasets** and select the storage pool that should hold application data.
2. If an appropriate parent does not already exist, click **Add Dataset**:
   - **Name:** `apps` (or your existing organizational name)
   - **Dataset Preset:** **Generic**
   - leave compression, sync, quota, and encryption inherited/default unless the pool requires something different
   - save it.
3. Select the new `apps` parent and click **Add Dataset** again:
   - **Name:** `kitchook`
   - **Dataset Preset:** **Apps**
   - under Advanced Options, verify case sensitivity is **Sensitive**; do not change inherited encryption settings
   - save it.
4. Record the resulting filesystem path. For pool `tank`, this is `/mnt/tank/apps/kitchook`; this runbook calls it `DATASET`.

The Generic parent is only an organizational/traversal layer and is not mounted into the container. Its default 755-style permissions allow UID 568 to traverse to the child. The leaf `kitchook` dataset gets the application-appropriate Apps settings. If you already have an Apps-preset parent, it can work, but inspect inherited ACL entries carefully: group 568 might inherit Modify access from that parent as well as receiving access on the child.

Do not select an **ixVolume** during app installation. Do not expose `apps`, `kitchook`, or a parent of `kitchook` as SMB or NFS; keep host-path safety checks enabled. Use a separate staging/share dataset if transfer requires one.

If creation of the dedicated child dataset fails, **stop and investigate** the parent traversal/ACL error. Do not skip the execution check, disable host-path safety checks, or silently substitute an ixVolume.

Create the required directories from **System Settings → Shell** (or an existing administrative SSH session):

```sh
DATASET=/mnt/tank/apps/kitchook  # replace tank/path with the real path
sudo mkdir -p "$DATASET/config" "$DATASET/site/releases"
```

Do not create `current` as a directory. The publisher creates it as a relative symlink after the first release passes validation.

## 2. Configure identities and permissions

For the initial manual test, an administrator can copy and publish files. Caddy runs as `UID:GID 568:568`; it needs read/traverse access only. The Phase 7 runner uses the official image's `UID:GID 1001:1001`, with Modify access only to `site/` and its separate runner-state path; follow the [runner runbook](runner/README.md) rather than granting access to `config/` or the parent dataset.

After copying the Caddyfile and publishing the first release, open **Datasets → apps → kitchook → Permissions → Edit ACL**:

1. retain `root`, your administrator, and `builtin_administrators` full-control entries;
2. inspect every named **apps** entry with numeric user or group ID 568—the 25.04.2.6 live Apps preset produced a user-568 Modify entry and a group-568 Read entry even though the preset documentation describes group 568 Modify;
3. reduce every UID/GID 568 entry to **Read**, removing a redundant entry if the UI permits, and leave inheritance enabled so files and directories remain readable;
4. remove unrelated broad Modify entries such as `builtin_users` from this dedicated dataset if they are not deliberately required;
5. select **Apply permissions recursively** because this is a new, dedicated dataset containing only KitchooK files; and
6. save, re-open the Permissions widget, and confirm no UID/GID 568 entry grants Modify.

Do not recursively change an established parent dataset or unrelated child datasets. If a UID/GID 568 Modify entry is inherited from an Apps-preset parent and cannot be reduced cleanly on `kitchook`, stop and inspect the parent ACL rather than stripping ACLs or granting broad access. The Compose read-only mount is sufficient for a short smoke test, but record the ACL issue for correction before calling Phase 6 complete.

Copy the repository configuration to the host and leave it non-writable by Caddy:

```sh
sudo install -m 0644 /path/to/Caddyfile "$DATASET/config/Caddyfile"
```

If the repository is not on TrueNAS, transfer `Caddyfile` and `publish-release.sh` to an administrator-controlled staging location first. Configuration changes require restarting the app because Caddy's admin API and persisted dynamic configuration are disabled.

## 3. Obtain and publish the first site artifact

### Fastest test from this checkout

On the development computer, build and package the deployable root:

```sh
npm test
npm run build
SHA=$(git rev-parse HEAD)
ARCHIVE="/tmp/kitchook-site-$SHA.tar.gz"
tar -C dist -czf "$ARCHIVE" .
printf 'Release SHA: %s\n' "$SHA"
```

Transfer the archive and the two operational files using an existing administrative SSH/SFTP path. Replace both placeholders:

```sh
scp "$ARCHIVE" infrastructure/Caddyfile infrastructure/publish-release.sh \
  ADMIN@TRUENAS_IP:/tmp/
```

Then open **System Settings → Shell** on TrueNAS (or connect through the same administrative SSH account) and run:

```sh
DATASET=/mnt/tank/apps/kitchook  # use the actual dataset path
SHA=<the-full-SHA-printed-on-the-development-computer>
STAGING=$(mktemp -d /tmp/kitchook-artifact.XXXXXX)

tar -xzf "/tmp/kitchook-site-$SHA.tar.gz" -C "$STAGING"
test -s "$STAGING/index.html"
test -s "$STAGING/search/index.json"
test -s "$STAGING/api/recipes.json"

sudo install -m 0644 /tmp/Caddyfile "$DATASET/config/Caddyfile"
sudo sh /tmp/publish-release.sh "$STAGING" "$SHA" "$DATASET/site"
readlink "$DATASET/site/current"
rm -rf "$STAGING"
```

If the TrueNAS shell is already running as root, omit `sudo`. `readlink` must print `releases/<full-SHA>`. Now return to the ACL instructions in section 2 and reduce the Apps group 568 entry to Read recursively before installing the container. The fast path has already published the release, so skip the rest of section 3 and continue with section 4 afterward.

### From GitHub Actions

1. Open the successful `main` workflow run in GitHub Actions.
2. Download the artifact named **site**. It is retained for 14 days.
3. Transfer the downloaded archive to a temporary location on TrueNAS using the site's existing approved SSH/SFTP or staging-share process. Do not create a public share for the application dataset.
4. Extract it into a new temporary directory. The extraction root must directly contain `index.html`, not a nested `dist/` directory.

Example on TrueNAS:

```sh
SHA=<full-commit-sha>
STAGING="/tmp/kitchook site $SHA"
mkdir -p "$STAGING"
unzip /path/to/site.zip -d "$STAGING"
test -s "$STAGING/index.html"
test -s "$STAGING/search/index.json"
test -s "$STAGING/api/recipes.json"
```

### From a local checkout

For an initial LAN test, a locally verified `dist/` has the same artifact-root contract:

```sh
npm test
npm run build
```

Transfer the **contents** of `dist/` to a temporary artifact directory on TrueNAS.

### Publish

Run the helper as the publisher identity, using the full commit SHA as the release ID:

```sh
sh /path/to/publish-release.sh "$STAGING" "$SHA" "$DATASET/site"
readlink "$DATASET/site/current"
```

The final command must print `releases/<full-commit-sha>`, with no leading slash. The helper:

- requires nonempty `index.html`, `search/index.json`, and `api/recipes.json`;
- rejects unsafe release IDs and artifacts containing symlinks;
- copies through a same-filesystem staging directory;
- makes completed release content read-only;
- records automation ownership/order outside immutable release content;
- never replaces an existing release ID;
- accepts a retry only when an existing managed release matches the artifact byte-for-byte;
- recovers an exact pending managed publication after an interrupted selection; and
- atomically replaces `current` with a relative symlink.

A failure before release completion removes its staging directory while retaining an exact pending ownership marker for safe retry. An unmanaged collision, mismatched retry, stale fixed staging path, or malformed selection fails closed. Pruning is a separate post-verification operation and never touches unmanaged directories.

## 4. Choose the LAN host port

Caddy uses container TCP port **8080**. Select one unused TrueNAS host port. Port **15000** is the template example and can be used only if no other service owns it.

Check **System Settings → Advanced → Access → Default Ports**, existing app port assignments, and (from an administrative shell if needed):

```sh
ss -ltn
```

The host port is independent of the TrueNAS dashboard's port 8080. Publishing `15000:8080` on the ordinary bridge network does not enable host networking.

## 5. Render and install the Compose YAML

Make a working copy of [`compose.yml`](compose.yml) and perform exactly these logical substitutions:

1. replace **both** occurrences of `/mnt/POOL/apps/kitchook` with the real `DATASET` path; and
2. replace published host port `"15000"` if another free port was selected.

Review the rendered file. It must contain only these host paths:

```text
<DATASET>/site
<DATASET>/config/Caddyfile
```

Then in TrueNAS 25.04.2.6:

1. open **Apps → Discover Apps**;
2. open the **⋮** menu and choose **Install via YAML**;
3. use application name `kitchook`;
4. paste the rendered Compose YAML; and
5. save/install it.

The long-form Compose port entry (`published: "15000"`, `target: 8080`, TCP) is the YAML equivalent of **Port Bind Mode → Publish port on the host for external access**. **Host Network** remains off. TrueNAS applies basic YAML validation but does not validate every Compose choice, so inspect the resulting app details: one bridge-published TCP port, two read-only Host Path mounts, and no extra persistent volume.

The service has a read-only root filesystem, drops all capabilities, disables privilege escalation, runs as `568:568`, and limits CPU, memory, and PIDs. `/data` and `/config` are bounded tmpfs mounts because the official image declares those runtime paths; they are disposable and are not site storage. The official Caddy binary carries `cap_net_bind_service` for privileged ports. Linux refuses to execute that file after Compose drops the capability from the bounding set, even though this service uses port 8080. The startup command therefore copies the binary to `/config` (which strips the file capability) and executes that copy. This preserves the exact pinned image while leaving the running Caddy process with no Linux capabilities.

## 6. LAN acceptance checks

Set these values on any LAN workstation:

```sh
BASE=http://<truenas-ip>:<host-port>
curl -fsS "$BASE/" >/dev/null
curl -fsS "$BASE/recipes/chicken-tikka-masala/" >/dev/null
curl -fsS "$BASE/search/index.json" >/dev/null
curl -fsS "$BASE/api/recipes.json" >/dev/null
test "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/definitely-missing")" = 404
```

Also verify:

```sh
curl -I "$BASE/"
curl -I "$BASE/search/index.json"
curl -I "$BASE/api/recipes.json"
curl -I "$BASE/_astro/<one-file-from-the-release>"
curl -H 'Accept-Encoding: gzip' -I "$BASE/"
```

Expected results:

- HTML, search JSON, API JSON, fonts, and every non-`/_astro/` path use `Cache-Control: no-cache` (storeable but revalidated);
- only `/_astro/*` uses `Cache-Control: public, max-age=31536000, immutable`;
- `Content-Encoding: gzip` is returned for a compressible response when requested (Caddy can also negotiate zstd);
- requests stay on HTTP and are not redirected to HTTPS;
- missing paths return a real 404, with no homepage/SPA fallback; and
- conservative CSP, permissions, referrer, framing, and content-type headers are present. HSTS is intentionally absent on LAN HTTP.

Open `http://<truenas-ip>:<host-port>` from the intended phone, tablet, desktop, and kitchen display. Exercise browse, a direct recipe route, and interactive search.

From the TrueNAS app's container shell, attempt:

```sh
touch /srv/should-not-work
```

It must fail with a read-only filesystem or permission error. Separately, run the publisher as its dedicated identity and confirm it can create a new release and switch `current`.

Finally:

1. restart the app and verify the same release returns;
2. stop and recreate/replace the app from the rendered YAML and verify files and `current` persist;
3. either verify there is no Cloudflare route, or verify every configured hostname is protected by tested, fail-closed Cloudflare Access (or equivalent); in all cases confirm there is no router/firewall port-forward; and
4. record the tested TrueNAS version, host port, client devices, restart result, replacement result, write-denial result, and remote-access posture in the instance's private operational records.

Until all live checks pass, record the precise pending checks and do not mark the deployment as accepted.

## Automated deployment, release switch, and rollback

Provision the dedicated runner using [`runner/README.md`](runner/README.md). The unified workflow builds once on GitHub-hosted Ubuntu, then only for a successful, still-current `main` push downloads the same-run artifact on `[self-hosted, kitchook-deploy]`. The runner does not check out source, build, or install npm dependencies.

`deploy-release.sh` publishes under the full commit SHA, confirms the relative selection, compares the LAN origin homepage/search/API bytes with the selected release using cache-busting requests, and restores and verifies the previous selection if the new content fails. Only after success does it retain five managed releases. A cleanup warning does not roll back an otherwise healthy deployment.

To roll back without rebuilding or restarting Caddy, run as the scoped publisher identity:

```sh
SITE="$DATASET/site"
OLD=<existing-release-id>
sh /path/to/select-release.sh "$OLD" "$SITE"
readlink "$SITE/current"
```

For migration, enroll the selected known-good Phase 6 baseline without selecting or modifying it:

```sh
sh /path/to/adopt-release.sh <baseline-release-id> "$SITE"
```

Confirm rollback through the direct LAN origin and a browser. Do not edit a completed release in place. Unknown/unmanaged release directories are never pruned automatically.

## Recovery notes

- **App is unhealthy immediately after install:** confirm `current` exists, is a relative symlink, and all parent paths are traversable/readable by UID 568.
- **Caddyfile change prevents startup:** compare the dataset copy with the repository file, validate it with the pinned image, restore the known-good copy, and restart the app.
- **Port collision:** choose another unused host port, update only `published`, and redeploy the YAML. Keep target 8080.
- **Bad release:** unattended verification restores the previous selection when possible; otherwise use `select-release.sh`. Do not delete the currently selected release.
- **Runner job remains queued:** verify the separate runner app is online with the repository-scoped `kitchook-deploy` label; GitHub will not fall back to another runner.
- **Stale deployment control path:** confirm no job is active, then inspect `.kitchook-deploy/` markers and hidden staging paths using the runner recovery guide. Do not blindly remove ownership/order records.
- **Container/app lost:** recreate it from the rendered YAML. The Host Path dataset, releases, and selection remain independent.
- **Dataset cannot be created or mounted:** stop and diagnose dataset/ACL/host-path validation. Do not fall back to ixVolume without revisiting the architecture.

## Local repository validation

With Docker available, these checks validate the exact pinned image and a temporary Compose rendering:

```sh
docker run --rm --platform linux/amd64 \
  -v "$PWD/infrastructure/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648 \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

docker run --rm --platform linux/amd64 \
  -v "$PWD/infrastructure/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648 \
  caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile --validate --pretty >/dev/null
```

Use `docker compose config` only after replacing the dataset path and host port in a temporary copy. Never point local tests at a real NAS dataset.

## Authenticated remote access

A Cloudflare Tunnel may use `http://<truenas-ip>:<host-port>` as its origin only when a self-hosted Cloudflare Access application restricts access to approved identities. Anonymous acceptance testing must receive a redirect to the Cloudflare Access login rather than origin content, and an approved user must test the authenticated flow. TLS and an unguessable hostname are not access control; never weaken or remove the fail-closed Access policy, and do not add a router port-forward.

## References checked for this implementation

- [TrueNAS 25.04 dataset management](https://www.truenas.com/docs/scale/25.04/scaletutorials/datasets/datasetsscale/) — the Apps preset, group 568 Modify entry, NFSv4/Passthrough ACL, case sensitivity, and atime settings.
- [TrueNAS 25.04 ACL configuration](https://www.truenas.com/docs/scale/25.04/scaletutorials/datasets/permissionsscale/) — Read/Modify/Traverse permissions and inheritance.
- [TrueNAS 25.04 Custom App screens](https://www.truenas.com/docs/scale/25.04/scaleuireference/apps/installcustomappscreens/) — **Install via YAML**, host ports, Host Path mounts, read-only storage, custom users, and resources.
- [TrueNAS host-path safety guidance](https://www.truenas.com/docs/scale/22.12/scaletutorials/apps/appadvancedsettings/configuring-host-path-safety-checks/) — keep application datasets separate from SMB/NFS shares.
- [Docker Official Caddy image](https://hub.docker.com/_/caddy) and [tag API](https://hub.docker.com/v2/repositories/library/caddy/tags/2.11.4-alpine) — tag, manifest digest, and architecture children.
- [Caddy global options](https://caddyserver.com/docs/caddyfile/options) and [header directive](https://caddyserver.com/docs/caddyfile/directives/header).
