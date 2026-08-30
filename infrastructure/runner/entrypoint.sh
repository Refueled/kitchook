#!/bin/sh

set -eu

fail() {
    echo "runner-entrypoint: $*" >&2
    exit 1
}

: "${RUNNER_REPOSITORY_URL:?set RUNNER_REPOSITORY_URL to the repository URL}"
: "${RUNNER_NAME:?set RUNNER_NAME}"
: "${RUNNER_LABELS:?set RUNNER_LABELS}"

RUNNER_ROOT=/runner
IMAGE_RUNNER_ROOT=/home/runner

[ -d "$RUNNER_ROOT" ] || fail "persistent runner root is not mounted: $RUNNER_ROOT"
[ -w "$RUNNER_ROOT" ] || fail "persistent runner root is not writable by UID 1001"
[ -x "$IMAGE_RUNNER_ROOT/config.sh" ] || fail "official image runner payload is missing"
: "${ACTIONS_RUNNER_HOOK_JOB_COMPLETED:?configure the job-completion cleanup hook}"
[ -x "$ACTIONS_RUNNER_HOOK_JOB_COMPLETED" ] ||
    fail "job-completion cleanup hook is not executable: $ACTIONS_RUNNER_HOOK_JOB_COMPLETED"
mkdir -p "${HOME:-/tmp/home}" "$RUNNER_ROOT/_work"

if [ ! -f "$RUNNER_ROOT/.runner" ]; then
    unexpected_state=$(find "$RUNNER_ROOT" -mindepth 1 -maxdepth 1 \
        ! -name _work ! -name lost+found -print -quit)
    if [ -n "$unexpected_state" ]; then
        fail "state path is nonempty but unregistered; review it before initialization: $unexpected_state"
    fi

    echo "Initializing persistent runner software from the pinned official image"
    # Upstream files use group 123 (docker). This app intentionally drops that
    # supplementary group, so preserve payload modes/links but not ownership.
    # Do not preserve timestamps: UID 1001 has Modify ACL access but deliberately
    # does not own the root-owned TrueNAS dataset mount itself.
    find "$IMAGE_RUNNER_ROOT" -mindepth 1 -maxdepth 1 \
        -exec cp -a --no-preserve=ownership,timestamps {} "$RUNNER_ROOT"/ \;
    cd "$RUNNER_ROOT"

    : "${RUNNER_REGISTRATION_TOKEN:?set the one-hour repository registration token for first startup}"
    case "$RUNNER_REGISTRATION_TOKEN" in
        REPLACE_*|CHANGE_ME*) fail "replace the registration-token placeholder" ;;
    esac
    case "$RUNNER_REPOSITORY_URL" in
        https://github.com/*/*) ;;
        *) fail "RUNNER_REPOSITORY_URL must be a full GitHub repository URL" ;;
    esac

    ./config.sh --unattended \
        --url "$RUNNER_REPOSITORY_URL" \
        --token "$RUNNER_REGISTRATION_TOKEN" \
        --name "$RUNNER_NAME" \
        --labels "$RUNNER_LABELS" \
        --work _work

    echo "Runner registration completed. Remove RUNNER_REGISTRATION_TOKEN from the TrueNAS app definition now."
else
    cd "$RUNNER_ROOT"
    [ -x ./run.sh ] || fail "registered state is missing run.sh"
fi

# The setup token is not inherited by cleanup, Runner.Listener, or jobs.
unset RUNNER_REGISTRATION_TOKEN

# Remove any workspace left by an interrupted prior container before accepting
# work. The same read-only hook runs after every normally completed job.
"$ACTIONS_RUNNER_HOOK_JOB_COMPLETED"

# The writable bind contains runner software so GitHub's default automatic
# updates persist. Job actions, artifacts, workspace, and temp files are on the
# nested _work tmpfs and disappear whenever the app is recreated.
exec ./run.sh
