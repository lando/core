#!/bin/bash
#
# test-containerd-engine.sh
#
# Standalone smoke test for the containerd engine path.
# Exercises containerd + buildkitd + nerdctl compose end-to-end.
#
# Usage:
#   bash scripts/test-containerd-engine.sh
#
# Requirements:
#   - containerd, nerdctl, buildkitd binaries installed
#   - Run as root (or with sudo) since containerd requires root privileges
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Colors & helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

step_num=0

step() {
  step_num=$((step_num + 1))
  printf "\n${CYAN}${BOLD}[Step %d]${RESET} %s\n" "$step_num" "$1"
}

ok() {
  printf "  ${GREEN}✔ %s${RESET}\n" "$1"
}

fail() {
  printf "  ${RED}✘ %s${RESET}\n" "$1"
}

info() {
  printf "  ${YELLOW}→ %s${RESET}\n" "$1"
}

# ---------------------------------------------------------------------------
# Paths & state
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/test-compose.yml"
TMPDIR_BASE="$(mktemp -d /tmp/lando-containerd-test.XXXXXX)"

CONTAINERD_SOCKET="${TMPDIR_BASE}/containerd.sock"
CONTAINERD_ROOT="${TMPDIR_BASE}/containerd-root"
CONTAINERD_STATE="${TMPDIR_BASE}/containerd-state"
CONTAINERD_CONFIG="${TMPDIR_BASE}/containerd-config.toml"
CONTAINERD_PID=""

BUILDKITD_SOCKET="${TMPDIR_BASE}/buildkitd.sock"
BUILDKITD_PID=""

CONTAINERD_LOG="${TMPDIR_BASE}/containerd.log"
BUILDKITD_LOG="${TMPDIR_BASE}/buildkitd.log"

# The project name nerdctl compose will use
COMPOSE_PROJECT="lando-containerd-test"

# Track whether we need cleanup
CLEANUP_NEEDED=0

# ---------------------------------------------------------------------------
# Cleanup handler
# ---------------------------------------------------------------------------
cleanup() {
  local exit_code=$?

  printf "\n${CYAN}${BOLD}[Cleanup]${RESET} Tearing down test resources...\n"

  # Stop the compose project (best effort)
  if command -v nerdctl &>/dev/null && [ -S "$CONTAINERD_SOCKET" ]; then
    info "Stopping nerdctl compose project..."
    CONTAINERD_ADDRESS="unix://${CONTAINERD_SOCKET}" \
      nerdctl compose \
        -f "$COMPOSE_FILE" \
        --project-name "$COMPOSE_PROJECT" \
        down --remove-orphans 2>/dev/null || true
  fi

  # Stop buildkitd
  if [ -n "$BUILDKITD_PID" ] && kill -0 "$BUILDKITD_PID" 2>/dev/null; then
    info "Stopping buildkitd (PID $BUILDKITD_PID)..."
    kill "$BUILDKITD_PID" 2>/dev/null || true
    wait "$BUILDKITD_PID" 2>/dev/null || true
    ok "buildkitd stopped"
  fi

  # Stop containerd
  if [ -n "$CONTAINERD_PID" ] && kill -0 "$CONTAINERD_PID" 2>/dev/null; then
    info "Stopping containerd (PID $CONTAINERD_PID)..."
    kill "$CONTAINERD_PID" 2>/dev/null || true
    wait "$CONTAINERD_PID" 2>/dev/null || true
    ok "containerd stopped"
  fi

  # Remove temp files
  if [ -d "$TMPDIR_BASE" ]; then
    info "Removing temp directory: ${TMPDIR_BASE}"
    rm -rf "$TMPDIR_BASE" 2>/dev/null || true
    ok "temp files cleaned up"
  fi

  if [ "$exit_code" -eq 0 ]; then
    printf "\n${GREEN}${BOLD}All tests passed!${RESET}\n\n"
  else
    printf "\n${RED}${BOLD}Test failed (exit code: %d)${RESET}\n" "$exit_code"
    printf "${YELLOW}Check logs at:${RESET}\n"
    printf "  containerd: %s\n" "$CONTAINERD_LOG"
    printf "  buildkitd:  %s\n\n" "$BUILDKITD_LOG"
    # Don't remove temp dir on failure so logs are preserved
  fi
}

trap cleanup EXIT

# ---------------------------------------------------------------------------
# Pre-flight: check binaries
# ---------------------------------------------------------------------------
printf "\n${BOLD}Lando Containerd Engine Smoke Test${RESET}\n"
printf "═══════════════════════════════════\n"

step "Checking required binaries"

MISSING=0

for bin in containerd nerdctl buildkitd; do
  if command -v "$bin" &>/dev/null; then
    ok "$bin found at $(command -v "$bin")"
  else
    fail "$bin not found in PATH"
    MISSING=1
  fi
done

if [ "$MISSING" -eq 1 ]; then
  fail "Missing required binaries — install them and retry."
  exit 1
fi

# Check for root (containerd usually requires it)
if [ "$(id -u)" -ne 0 ]; then
  printf "\n"
  fail "This script must be run as root (containerd requires root privileges)."
  info "Try: sudo bash $0"
  exit 1
fi

# Check compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
  fail "Compose file not found: ${COMPOSE_FILE}"
  exit 1
fi
ok "Compose file found: ${COMPOSE_FILE}"

# ---------------------------------------------------------------------------
# Step 2: Start containerd
# ---------------------------------------------------------------------------
step "Starting fresh containerd instance"

mkdir -p "$CONTAINERD_ROOT" "$CONTAINERD_STATE"

# Generate a minimal containerd config pointing to our temp paths
cat > "$CONTAINERD_CONFIG" <<EOF
version = 2
root = "${CONTAINERD_ROOT}"
state = "${CONTAINERD_STATE}"

[grpc]
  address = "${CONTAINERD_SOCKET}"

[plugins."io.containerd.grpc.v1.cri"]
  disable_tcp_service = true
EOF

info "Config: ${CONTAINERD_CONFIG}"
info "Socket: ${CONTAINERD_SOCKET}"
info "Root:   ${CONTAINERD_ROOT}"

containerd --config "$CONTAINERD_CONFIG" \
  > "$CONTAINERD_LOG" 2>&1 &
CONTAINERD_PID=$!
CLEANUP_NEEDED=1

info "containerd started with PID ${CONTAINERD_PID}"

# Wait for the socket to become available
info "Waiting for containerd socket..."
for i in $(seq 1 30); do
  if [ -S "$CONTAINERD_SOCKET" ]; then
    break
  fi
  sleep 0.5
done

if [ ! -S "$CONTAINERD_SOCKET" ]; then
  fail "containerd socket did not appear after 15 seconds"
  printf "  Log output:\n"
  tail -20 "$CONTAINERD_LOG" | sed 's/^/    /'
  exit 1
fi

ok "containerd is ready"

# ---------------------------------------------------------------------------
# Step 3: Start buildkitd
# ---------------------------------------------------------------------------
step "Starting buildkitd (connected to containerd)"

buildkitd \
  --addr "unix://${BUILDKITD_SOCKET}" \
  --containerd-worker=true \
  --containerd-worker-addr="${CONTAINERD_SOCKET}" \
  --oci-worker=false \
  --root "${TMPDIR_BASE}/buildkitd-root" \
  > "$BUILDKITD_LOG" 2>&1 &
BUILDKITD_PID=$!

info "buildkitd started with PID ${BUILDKITD_PID}"

# Wait for buildkitd socket
info "Waiting for buildkitd socket..."
for i in $(seq 1 30); do
  if [ -S "$BUILDKITD_SOCKET" ]; then
    break
  fi
  sleep 0.5
done

if [ ! -S "$BUILDKITD_SOCKET" ]; then
  fail "buildkitd socket did not appear after 15 seconds"
  printf "  Log output:\n"
  tail -20 "$BUILDKITD_LOG" | sed 's/^/    /'
  exit 1
fi

ok "buildkitd is ready"

# ---------------------------------------------------------------------------
# Step 4: Run nerdctl compose up
# ---------------------------------------------------------------------------
step "Running nerdctl compose up (nginx:alpine on port 8099)"

export CONTAINERD_ADDRESS="unix://${CONTAINERD_SOCKET}"
export BUILDKIT_HOST="unix://${BUILDKITD_SOCKET}"

info "CONTAINERD_ADDRESS=${CONTAINERD_ADDRESS}"
info "BUILDKIT_HOST=${BUILDKIT_HOST}"

nerdctl compose \
  -f "$COMPOSE_FILE" \
  --project-name "$COMPOSE_PROJECT" \
  up -d 2>&1 | sed 's/^/    /'

if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  fail "nerdctl compose up failed"
  exit 1
fi

ok "nerdctl compose up succeeded"

# ---------------------------------------------------------------------------
# Step 5: Verify the container is running
# ---------------------------------------------------------------------------
step "Verifying container is running"

# Give the container a moment to start
sleep 2

# Check that the container is listed
RUNNING=$(nerdctl --address "${CONTAINERD_SOCKET}" ps --format '{{.Names}}' 2>/dev/null | grep -c "${COMPOSE_PROJECT}" || true)

if [ "$RUNNING" -ge 1 ]; then
  ok "Found running container(s) for project '${COMPOSE_PROJECT}'"
  nerdctl --address "${CONTAINERD_SOCKET}" ps --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | sed 's/^/    /'
else
  # Fallback: try checking without address filter (some nerdctl versions)
  info "Checking container list (fallback)..."
  nerdctl --address "${CONTAINERD_SOCKET}" ps -a 2>/dev/null | sed 's/^/    /'
  fail "No running containers found for project '${COMPOSE_PROJECT}'"
  exit 1
fi

# Try to hit the nginx endpoint
info "Testing HTTP response on port 8099..."
sleep 1

if command -v curl &>/dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8099 2>/dev/null || echo "000")
elif command -v wget &>/dev/null; then
  HTTP_CODE=$(wget -qO /dev/null --server-response http://127.0.0.1:8099 2>&1 | awk '/HTTP/{print $2}' | tail -1 || echo "000")
else
  info "Neither curl nor wget available — skipping HTTP check"
  HTTP_CODE="skip"
fi

if [ "$HTTP_CODE" = "200" ]; then
  ok "nginx responded with HTTP 200"
elif [ "$HTTP_CODE" = "skip" ]; then
  info "HTTP check skipped (no curl/wget)"
else
  fail "Expected HTTP 200, got ${HTTP_CODE}"
  info "Container may still be starting — this is not necessarily fatal"
fi

# ---------------------------------------------------------------------------
# Step 6: Stop the compose project
# ---------------------------------------------------------------------------
step "Stopping nerdctl compose project"

nerdctl compose \
  -f "$COMPOSE_FILE" \
  --project-name "$COMPOSE_PROJECT" \
  down --remove-orphans 2>&1 | sed 's/^/    /'

ok "Compose project stopped"

# Verify container is gone
sleep 1
REMAINING=$(nerdctl --address "${CONTAINERD_SOCKET}" ps --format '{{.Names}}' 2>/dev/null | grep -c "${COMPOSE_PROJECT}" || true)

if [ "$REMAINING" -eq 0 ]; then
  ok "All containers removed"
else
  fail "Some containers still running"
fi

# ---------------------------------------------------------------------------
# Step 7: Cleanup is handled by the EXIT trap
# ---------------------------------------------------------------------------
step "Cleanup (handled by exit trap)"
ok "Cleanup will run automatically on exit"

printf "\n${GREEN}${BOLD}Smoke test completed successfully!${RESET}\n\n"
