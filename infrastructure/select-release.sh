#!/bin/sh

set -eu

usage() {
    echo "Usage: $0 <release-id> <site-root>" >&2
    exit 64
}

[ "$#" -eq 2 ] || usage

PROGRAM=select-release
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
# shellcheck source=release-lib.sh
. "$SCRIPT_DIR/release-lib.sh"

release_id=$1
validate_release_id "$release_id"
prepare_site_root "$2"
atomic_select_release "$release_id"

printf 'Selected release %s\n' "$release_id"
printf 'Current selection: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
