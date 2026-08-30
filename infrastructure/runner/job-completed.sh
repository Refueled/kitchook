#!/bin/sh

set -eu

work_root=/runner/_work
[ -d "$work_root" ] || {
    echo "job-completed: runner workspace is not mounted: $work_root" >&2
    exit 1
}

# This hook lives outside _work, so it can remove downloaded actions, artifact
# contents, repository workspaces, and temp files after every completed job.
# Preserve only _update, which Runner.Listener may use for its automatic update
# transaction. The tmpfs mount remains the final container-recreation boundary.
cd /runner
find "$work_root" -mindepth 1 -maxdepth 1 ! -name _update -exec chmod -R u+w {} +
find "$work_root" -mindepth 1 -maxdepth 1 ! -name _update -exec rm -rf {} +

if [ -n "$(find "$work_root" -mindepth 1 -maxdepth 1 ! -name _update -print -quit)" ]; then
    echo "job-completed: runner workspace cleanup was incomplete" >&2
    exit 1
fi

echo "Runner workspace cleared after job completion"
