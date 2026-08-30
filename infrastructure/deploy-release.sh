#!/bin/sh

set -eu

usage() {
    echo "Usage: $0 <artifact-root> <release-id> <site-root> <origin-url> <retain-count>" >&2
    exit 64
}

[ "$#" -eq 5 ] || usage

PROGRAM=deploy-release
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
# shellcheck source=release-lib.sh
. "$SCRIPT_DIR/release-lib.sh"

source_dir=${1%/}
[ -n "$source_dir" ] || source_dir=/
release_id=$2
site_argument=$3
origin_url=${4%/}
retain_count=$5

validate_release_id "$release_id"
validate_artifact_root "$source_dir" artifact
case "$origin_url" in
    http://*|https://*) ;;
    *) fail "origin URL must begin with http:// or https://" ;;
esac
case "$origin_url" in
    *[\?#]*|*[[:space:]]*) fail "origin URL must not contain whitespace, a query, or a fragment" ;;
esac
case "$retain_count" in
    ""|*[!0-9]*|0) fail "retain count must be a positive integer" ;;
esac

prepare_site_root "$site_argument"
ensure_management

verify_tmp=$(mktemp "${TMPDIR:-/tmp}/kitchook-verify.XXXXXX")
lock_dir=$management_dir/deploy.lock
if ! mkdir "$lock_dir" 2>/dev/null; then
    rm -f "$verify_tmp"
    fail "another deployment is active, or a stale lock requires review: $lock_dir"
fi

cleanup_deploy() {
    rm -f "$verify_tmp"
    rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup_deploy EXIT HUP INT TERM

previous_id=
if [ -L "$current_link" ]; then
    previous_id=$(current_release_id)
    validate_release_dir "$previous_id"
fi

verify_origin() {
    verify_id=$1
    validate_release_dir "$verify_id"

    for endpoint in index.html search/index.json api/recipes.json; do
        case "$endpoint" in
            index.html) request_path= ;;
            *) request_path=$endpoint ;;
        esac

        if ! curl --fail --silent --show-error --location \
            --connect-timeout 5 --max-time 20 \
            -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
            --output "$verify_tmp" -- \
            "$origin_url/$request_path?kitchook_release=$verify_id"; then
            echo "$PROGRAM: origin request failed for $request_path" >&2
            return 1
        fi
        if [ ! -s "$verify_tmp" ]; then
            echo "$PROGRAM: origin returned an empty response for $request_path" >&2
            return 1
        fi
        if ! cmp -s "$verify_tmp" "$releases_dir/$verify_id/$endpoint"; then
            echo "$PROGRAM: origin bytes do not match release $verify_id for $endpoint" >&2
            return 1
        fi
    done
}

"$SCRIPT_DIR/publish-release.sh" "$source_dir" "$release_id" "$site_root"

[ -L "$current_link" ] || fail "publication did not create the current symlink"
[ "$(readlink "$current_link")" = "releases/$release_id" ] ||
    fail "publication selected an unexpected current target"
validate_release_dir "$release_id"

if ! verify_origin "$release_id"; then
    echo "$PROGRAM: verification failed for release $release_id" >&2
    if [ -n "$previous_id" ]; then
        echo "$PROGRAM: restoring previous release $previous_id" >&2
        "$SCRIPT_DIR/select-release.sh" "$previous_id" "$site_root"
        if verify_origin "$previous_id"; then
            fail "new release failed verification; previous release was restored and verified"
        fi
        fail "new release failed verification; previous selection was restored but origin verification also failed"
    fi
    fail "new release failed verification and no previous release exists to restore"
fi

# Retention is deliberately post-verification. Its failure is visible in logs
# but does not roll back or misclassify an already verified publication.
if ! "$SCRIPT_DIR/prune-releases.sh" "$site_root" "$retain_count" "$release_id"; then
    echo "$PROGRAM: WARNING: release $release_id is healthy, but retention cleanup failed" >&2
    if [ "${GITHUB_ACTIONS:-}" = true ]; then
        echo "::warning title=Release retention::Release $release_id deployed, but old-release cleanup failed"
    fi
fi

printf 'Deployed and verified release %s\n' "$release_id"
printf 'Current selection: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
