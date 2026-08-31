#!/bin/sh
set -eu

if [ "$#" -gt 2 ]; then
  echo "Usage: kitchook-build [INPUT_DIRECTORY] [OUTPUT_DIRECTORY]" >&2
  exit 64
fi

input_directory=${1:-/input}
output_directory=${2:-/output}

if [ ! -r "$input_directory/instance.config.json" ] || [ ! -d "$input_directory/recipes" ]; then
  echo "Input directory must contain readable instance.config.json and recipes/." >&2
  exit 64
fi
if [ ! -d "$output_directory" ] || [ ! -w "$output_directory" ]; then
  echo "Output directory must exist and be writable by the builder user." >&2
  exit 73
fi

input_real=$(readlink -f "$input_directory")
output_real=$(readlink -f "$output_directory")
if [ "$input_real" = "$output_real" ]; then
  echo "Input and output directories must be different." >&2
  exit 64
fi
case "$output_real" in
  "$input_real"/*)
    echo "Output directory must not be inside the input directory." >&2
    exit 64
    ;;
esac
case "$input_real" in
  "$output_real"/*)
    echo "Input directory must not be inside the output directory." >&2
    exit 64
    ;;
esac

staging_directory=/app/.kitchook-build
rm -rf "$staging_directory"
cleanup() {
  rm -rf "$staging_directory"
}
trap cleanup EXIT HUP INT TERM

# Astro requires its prerender workspace and output to share a filesystem.
# Build in the disposable container layer, verify there, then copy only a
# complete artifact to the mounted output. A malformed collection therefore
# leaves a pre-existing output untouched.
mkdir -p /tmp/home /tmp/npm
KITCHOOK_CONTENT_DIR="$input_real" \
KITCHOOK_OUTPUT_DIR="$staging_directory" \
npm run build

for required_path in index.html recipes search/index.json api/recipes.json _astro; do
  if [ ! -e "$staging_directory/$required_path" ]; then
    echo "Builder output is missing required path: $required_path" >&2
    exit 70
  fi
done

# Publication happens only after a complete, verified build.
find "$output_real" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$staging_directory/." "$output_real/"
rm -rf "$staging_directory"
trap - EXIT HUP INT TERM

echo "Built KitchooK! static site in $output_real"
