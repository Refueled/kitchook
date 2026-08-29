#!/bin/sh

set -eu

usage() {
    echo "Usage: $0 <artifact-root> <release-id> <site-root>" >&2
    echo "  artifact-root must directly contain index.html, search/index.json," >&2
    echo "  and api/recipes.json." >&2
    exit 64
}

fail() {
    echo "publish-release: $*" >&2
    exit 1
}

[ "$#" -eq 3 ] || usage

source_dir=${1%/}
release_id=$2
site_root=${3%/}

[ -n "$source_dir" ] || source_dir=/
[ -n "$site_root" ] || site_root=/
[ -d "$source_dir" ] || fail "artifact root is not a directory: $source_dir"

case "$release_id" in
    ""|.|..|*[!A-Za-z0-9._-]*)
        fail "release ID must use only letters, numbers, dots, underscores, and hyphens"
        ;;
    [A-Za-z0-9]*) ;;
    *) fail "release ID must begin with a letter or number" ;;
esac

[ "${#release_id}" -le 128 ] || fail "release ID must be 128 characters or fewer"

for required_file in index.html search/index.json api/recipes.json; do
    [ -f "$source_dir/$required_file" ] ||
        fail "artifact is missing required file: $required_file"
    [ -s "$source_dir/$required_file" ] ||
        fail "required artifact file is empty: $required_file"
done

if find "$source_dir" -type l -print -quit | grep -q .; then
    fail "artifact must not contain symbolic links"
fi

if [ -L "$site_root" ]; then
    fail "site root must be a real directory, not a symbolic link: $site_root"
fi

umask 022
mkdir -p "$site_root"
releases_dir=$site_root/releases

if [ -L "$releases_dir" ]; then
    fail "releases path must be a real directory, not a symbolic link: $releases_dir"
fi
mkdir -p "$releases_dir"
[ -d "$releases_dir" ] || fail "releases path is not a directory: $releases_dir"

release_dir=$releases_dir/$release_id
if [ -e "$release_dir" ] || [ -L "$release_dir" ]; then
    fail "release already exists and will not be replaced: $release_id"
fi

current_link=$site_root/current
if { [ -e "$current_link" ] || [ -L "$current_link" ]; } && [ ! -L "$current_link" ]; then
    fail "current exists but is not a symbolic link: $current_link"
fi

stage_dir=$releases_dir/.${release_id}.staging.$$
next_link=$site_root/.current.staging.$$

cleanup() {
    if [ -n "${stage_dir:-}" ] && [ -e "$stage_dir" ]; then
        chmod -R u+w "$stage_dir" 2>/dev/null || true
        rm -rf "$stage_dir"
    fi
    if [ -n "${next_link:-}" ] && [ -L "$next_link" ]; then
        rm -f "$next_link"
    fi
}
trap cleanup EXIT HUP INT TERM

[ ! -e "$stage_dir" ] && [ ! -L "$stage_dir" ] ||
    fail "temporary staging path already exists: $stage_dir"
mkdir "$stage_dir"
cp -R "$source_dir"/. "$stage_dir"/

for required_file in index.html search/index.json api/recipes.json; do
    [ -s "$stage_dir/$required_file" ] ||
        fail "staged release failed validation: $required_file"
done

# Static content is readable by Caddy. Completed releases are read-only and
# are never replaced by this helper.
chmod -R a+rX,a-w "$stage_dir"
# No destination exists here; a plain rename keeps the helper usable on both
# TrueNAS (GNU coreutils) and maintainer workstations.
mv "$stage_dir" "$release_dir"
stage_dir=

ln -s "releases/$release_id" "$next_link"
if mv --help 2>&1 | grep -q -- '--no-target-directory'; then
    mv -Tf "$next_link" "$current_link"
else
    # BSD mv uses -h for the same important behavior: replace a destination
    # symlink itself rather than following a symlink that points to a directory.
    mv -fh "$next_link" "$current_link"
fi
next_link=

printf 'Published release %s\n' "$release_id"
printf 'Current selection: %s -> %s\n' "$current_link" "$(readlink "$current_link")"
