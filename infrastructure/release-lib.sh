#!/bin/sh

# Shared release validation, metadata, and atomic-selection helpers.
# Callers must set PROGRAM before sourcing this file.

: "${PROGRAM:=release-helper}"

fail() {
    echo "$PROGRAM: $*" >&2
    exit 1
}

validate_release_id() {
    release_id_to_validate=$1

    case "$release_id_to_validate" in
        ""|.|..|*[!A-Za-z0-9._-]*)
            fail "release ID must use only letters, numbers, dots, underscores, and hyphens"
            ;;
        [A-Za-z0-9]*) ;;
        *) fail "release ID must begin with a letter or number" ;;
    esac

    [ "${#release_id_to_validate}" -le 128 ] ||
        fail "release ID must be 128 characters or fewer"
}

validate_artifact_root() {
    artifact_root=${1%/}
    artifact_description=${2:-artifact}
    [ -n "$artifact_root" ] || artifact_root=/

    [ ! -L "$artifact_root" ] ||
        fail "$artifact_description root must not be a symbolic link: $artifact_root"
    [ -d "$artifact_root" ] ||
        fail "$artifact_description root is not a directory: $artifact_root"

    for required_file in index.html search/index.json api/recipes.json; do
        [ -f "$artifact_root/$required_file" ] ||
            fail "$artifact_description is missing required file: $required_file"
        [ -s "$artifact_root/$required_file" ] ||
            fail "required $artifact_description file is empty: $required_file"
    done

    if ! artifact_symlink=$(find "$artifact_root" -type l -print -quit); then
        fail "could not inspect $artifact_description for symbolic links"
    fi
    [ -z "$artifact_symlink" ] ||
        fail "$artifact_description must not contain symbolic links"
}

prepare_site_root() {
    site_root=${1%/}
    [ -n "$site_root" ] || site_root=/

    [ ! -L "$site_root" ] ||
        fail "site root must be a real directory, not a symbolic link: $site_root"
    umask 022
    mkdir -p "$site_root"
    [ -d "$site_root" ] || fail "site root is not a directory: $site_root"

    releases_dir=$site_root/releases
    [ ! -L "$releases_dir" ] ||
        fail "releases path must be a real directory, not a symbolic link: $releases_dir"
    mkdir -p "$releases_dir"
    [ -d "$releases_dir" ] || fail "releases path is not a directory: $releases_dir"

    current_link=$site_root/current
    if { [ -e "$current_link" ] || [ -L "$current_link" ]; } && [ ! -L "$current_link" ]; then
        fail "current exists but is not a symbolic link: $current_link"
    fi
}

validate_release_dir() {
    release_id_to_validate=$1
    validate_release_id "$release_id_to_validate"
    release_dir=$releases_dir/$release_id_to_validate

    [ ! -L "$release_dir" ] ||
        fail "release directory must not be a symbolic link: $release_id_to_validate"
    [ -d "$release_dir" ] || fail "release does not exist: $release_id_to_validate"
    validate_artifact_root "$release_dir" "release $release_id_to_validate"
}

ensure_management() {
    management_dir=$site_root/.kitchook-deploy
    [ ! -L "$management_dir" ] ||
        fail "management path must not be a symbolic link: $management_dir"
    mkdir -p "$management_dir"
    [ -d "$management_dir" ] || fail "management path is not a directory: $management_dir"

    pending_dir=$management_dir/pending
    pruning_dir=$management_dir/pruning
    for control_dir in "$pending_dir" "$pruning_dir"; do
        [ ! -L "$control_dir" ] ||
            fail "management control path must not be a symbolic link: $control_dir"
        mkdir -p "$control_dir"
        [ -d "$control_dir" ] || fail "management control path is not a directory: $control_dir"
    done

    history_file=$management_dir/releases
    if [ -e "$history_file" ] || [ -L "$history_file" ]; then
        [ ! -L "$history_file" ] && [ -f "$history_file" ] ||
            fail "managed-release history must be a regular file: $history_file"
    else
        : >"$history_file"
        chmod 0644 "$history_file"
    fi

    validate_history
}

validate_history() {
    while IFS= read -r managed_id || [ -n "$managed_id" ]; do
        [ -n "$managed_id" ] || fail "managed-release history contains a blank record"
        validate_release_id "$managed_id"
    done <"$history_file"

    duplicate_ids=$(sort "$history_file" | uniq -d)
    [ -z "$duplicate_ids" ] ||
        fail "managed-release history contains duplicate records: $duplicate_ids"
}

is_managed_release() {
    grep -Fqx "$1" "$history_file"
}

record_managed_release() {
    release_id_to_record=$1
    validate_release_id "$release_id_to_record"
    validate_history

    if is_managed_release "$release_id_to_record"; then
        return 0
    fi

    history_tmp=$management_dir/.releases.$$
    rm -f "$history_tmp"
    if ! { cat "$history_file"; printf '%s\n' "$release_id_to_record"; } >"$history_tmp"; then
        rm -f "$history_tmp"
        fail "could not stage managed-release history"
    fi
    chmod 0644 "$history_tmp" || {
        rm -f "$history_tmp"
        fail "could not set managed-release history permissions"
    }
    mv -f "$history_tmp" "$history_file" || {
        rm -f "$history_tmp"
        fail "could not commit managed-release history"
    }
}

remove_managed_record() {
    release_id_to_remove=$1
    history_tmp=$management_dir/.releases.$$
    rm -f "$history_tmp"
    : >"$history_tmp"

    while IFS= read -r managed_id || [ -n "$managed_id" ]; do
        [ "$managed_id" = "$release_id_to_remove" ] ||
            printf '%s\n' "$managed_id" >>"$history_tmp"
    done <"$history_file"

    chmod 0644 "$history_tmp" || {
        rm -f "$history_tmp"
        fail "could not set managed-release history permissions"
    }
    mv -f "$history_tmp" "$history_file" || {
        rm -f "$history_tmp"
        fail "could not update managed-release history"
    }
}

write_control_marker() {
    marker_path=$1
    marker_id=$2

    if [ -e "$marker_path" ] || [ -L "$marker_path" ]; then
        [ ! -L "$marker_path" ] && [ -f "$marker_path" ] ||
            fail "control marker must be a regular file: $marker_path"
        [ "$(cat "$marker_path")" = "$marker_id" ] ||
            fail "control marker does not match release: $marker_path"
        return 0
    fi

    marker_tmp=$management_dir/.marker.$$
    rm -f "$marker_tmp"
    printf '%s\n' "$marker_id" >"$marker_tmp"
    chmod 0644 "$marker_tmp"
    mv "$marker_tmp" "$marker_path" || {
        rm -f "$marker_tmp"
        fail "could not commit control marker: $marker_path"
    }
}

current_release_id() {
    [ -L "$current_link" ] || return 1
    current_target=$(readlink "$current_link")
    case "$current_target" in
        releases/*)
            selected_id=${current_target#releases/}
            validate_release_id "$selected_id"
            [ "$current_target" = "releases/$selected_id" ] ||
                fail "current target is not a direct relative release: $current_target"
            printf '%s\n' "$selected_id"
            ;;
        *) fail "current target is not a relative release: $current_target" ;;
    esac
}

atomic_select_release() {
    release_id_to_select=$1
    validate_release_dir "$release_id_to_select"

    next_link=$site_root/.current.staging.$$
    [ ! -e "$next_link" ] && [ ! -L "$next_link" ] ||
        fail "temporary selection path already exists: $next_link"

    ln -s "releases/$release_id_to_select" "$next_link"
    if mv --help 2>&1 | grep -q -- '--no-target-directory'; then
        if ! mv -Tf "$next_link" "$current_link"; then
            rm -f "$next_link"
            fail "could not atomically select release: $release_id_to_select"
        fi
    else
        if ! mv -fh "$next_link" "$current_link"; then
            rm -f "$next_link"
            fail "could not atomically select release: $release_id_to_select"
        fi
    fi

    [ "$(readlink "$current_link")" = "releases/$release_id_to_select" ] ||
        fail "current selection did not resolve to the requested release"
}
