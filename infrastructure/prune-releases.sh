#!/bin/sh

set -eu

usage() {
    echo "Usage: $0 <site-root> <retain-count> [protected-release-id]" >&2
    echo "  Only explicitly managed releases are eligible for removal." >&2
    exit 64
}

[ "$#" -ge 2 ] && [ "$#" -le 3 ] || usage

PROGRAM=prune-releases
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
# shellcheck source=release-lib.sh
. "$SCRIPT_DIR/release-lib.sh"

retain_count=$2
case "$retain_count" in
    ""|*[!0-9]*|0) fail "retain count must be a positive integer" ;;
esac

protected_id=${3:-}
if [ -n "$protected_id" ]; then
    validate_release_id "$protected_id"
fi

prepare_site_root "$1"
ensure_management

current_id=
if [ -L "$current_link" ]; then
    current_id=$(current_release_id)
    validate_release_dir "$current_id"
fi

# Finish metadata cleanup only when a prior pruning marker proves that this
# helper removed the corresponding managed directory before being interrupted.
for pruning_marker in "$pruning_dir"/*; do
    [ -e "$pruning_marker" ] || [ -L "$pruning_marker" ] || continue
    pruning_id=${pruning_marker##*/}
    validate_release_id "$pruning_id"
    write_control_marker "$pruning_marker" "$pruning_id"

    if [ ! -e "$releases_dir/$pruning_id" ] && [ ! -L "$releases_dir/$pruning_id" ]; then
        [ "$pruning_id" != "$current_id" ] ||
            fail "current release is missing during pruning recovery: $pruning_id"
        if is_managed_release "$pruning_id"; then
            remove_managed_record "$pruning_id"
        fi
        rm -f "$pruning_marker"
    fi
done

# Every managed record must identify a valid release unless the transaction
# recovery above just removed its completed pruning record.
while IFS= read -r managed_id || [ -n "$managed_id" ]; do
    validate_release_dir "$managed_id"
done <"$history_file"

managed_count=$(wc -l <"$history_file" | tr -d ' ')
pruned_count=0

while [ "$managed_count" -gt "$retain_count" ]; do
    candidate=
    while IFS= read -r managed_id || [ -n "$managed_id" ]; do
        [ "$managed_id" = "$current_id" ] && continue
        [ -n "$protected_id" ] && [ "$managed_id" = "$protected_id" ] && continue
        candidate=$managed_id
        break
    done <"$history_file"

    if [ -z "$candidate" ]; then
        fail "protected releases prevent pruning to the requested count"
    fi

    pruning_marker=$pruning_dir/$candidate
    write_control_marker "$pruning_marker" "$candidate"
    # Completed trees are read-only. Retention changes permissions only on the
    # selected tree immediately before removing that tree as a whole.
    chmod -R u+w "$releases_dir/$candidate" ||
        fail "could not prepare managed release for removal: $candidate"
    rm -rf "$releases_dir/$candidate" ||
        fail "could not remove managed release: $candidate"
    [ ! -e "$releases_dir/$candidate" ] && [ ! -L "$releases_dir/$candidate" ] ||
        fail "managed release still exists after removal: $candidate"

    remove_managed_record "$candidate"
    rm -f "$pruning_marker"
    managed_count=$((managed_count - 1))
    pruned_count=$((pruned_count + 1))
    printf 'Pruned managed release %s\n' "$candidate"
done

printf 'Retention complete: %s managed release(s), %s removed\n' \
    "$managed_count" "$pruned_count"
