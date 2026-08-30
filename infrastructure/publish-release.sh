#!/bin/sh

set -eu

usage() {
    echo "Usage: $0 <artifact-root> <release-id> <site-root>" >&2
    echo "  artifact-root must directly contain index.html, search/index.json," >&2
    echo "  and api/recipes.json." >&2
    exit 64
}

[ "$#" -eq 3 ] || usage

PROGRAM=publish-release
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
# shellcheck source=release-lib.sh
. "$SCRIPT_DIR/release-lib.sh"

source_dir=${1%/}
[ -n "$source_dir" ] || source_dir=/
release_id=$2
validate_release_id "$release_id"
validate_artifact_root "$source_dir" artifact
prepare_site_root "$3"
ensure_management

release_dir=$releases_dir/$release_id
pending_marker=$pending_dir/$release_id
stage_dir=$releases_dir/.${release_id}.staging
stage_created=false

cleanup() {
    if [ "${stage_created:-false}" = true ] && [ -n "${stage_dir:-}" ] &&
        { [ -e "$stage_dir" ] || [ -L "$stage_dir" ]; }; then
        chmod -R u+w "$stage_dir" 2>/dev/null || true
        rm -rf "$stage_dir"
    fi
}
trap cleanup EXIT HUP INT TERM

if [ -e "$release_dir" ] || [ -L "$release_dir" ]; then
    validate_release_dir "$release_id"
    if ! diff -qr "$source_dir" "$release_dir" >/dev/null 2>&1; then
        fail "existing release does not match the supplied artifact: $release_id"
    fi

    if is_managed_release "$release_id"; then
        if [ -e "$pending_marker" ] || [ -L "$pending_marker" ]; then
            write_control_marker "$pending_marker" "$release_id"
            rm -f "$pending_marker"
        fi
        atomic_select_release "$release_id"
        printf 'Release %s already exists, matches, and is managed; selection recovered\n' "$release_id"
        printf 'Current selection: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
        exit 0
    fi

    if [ -e "$pending_marker" ] || [ -L "$pending_marker" ]; then
        write_control_marker "$pending_marker" "$release_id"
        record_managed_release "$release_id"
        rm -f "$pending_marker"
        atomic_select_release "$release_id"
        printf 'Recovered interrupted publication of release %s\n' "$release_id"
        printf 'Current selection: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
        exit 0
    fi

    fail "release already exists but is not owned by this automation: $release_id"
fi

if is_managed_release "$release_id"; then
    fail "managed-release history references a missing release: $release_id"
fi

write_control_marker "$pending_marker" "$release_id"

[ ! -e "$stage_dir" ] && [ ! -L "$stage_dir" ] ||
    fail "stale staging path requires operator review: $stage_dir"
mkdir "$stage_dir"
stage_created=true
cp -R "$source_dir"/. "$stage_dir"/
validate_artifact_root "$stage_dir" "staged release"

# Completed release content is readable by Caddy, immutable in place, and only
# removable as a whole by the retention helper.
chmod -R a+rX,a-w "$stage_dir"
mv "$stage_dir" "$release_dir"
stage_created=false
stage_dir=

record_managed_release "$release_id"
rm -f "$pending_marker"
atomic_select_release "$release_id"

printf 'Published managed release %s\n' "$release_id"
printf 'Current selection: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
