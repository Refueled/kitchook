#!/bin/sh

set -eu

usage() {
    echo "Usage: $0 <release-id> <site-root>" >&2
    echo "  Enrolls one validated existing release without selecting it." >&2
    exit 64
}

[ "$#" -eq 2 ] || usage

PROGRAM=adopt-release
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
# shellcheck source=release-lib.sh
. "$SCRIPT_DIR/release-lib.sh"

release_id=$1
validate_release_id "$release_id"
prepare_site_root "$2"
validate_release_dir "$release_id"
ensure_management

pending_marker=$pending_dir/$release_id
if [ -e "$pending_marker" ] || [ -L "$pending_marker" ]; then
    fail "release has an unfinished automated publication marker: $release_id"
fi

if is_managed_release "$release_id"; then
    printf 'Release %s is already managed\n' "$release_id"
    exit 0
fi

record_managed_release "$release_id"
printf 'Adopted existing release %s\n' "$release_id"
