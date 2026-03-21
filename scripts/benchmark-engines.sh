#!/usr/bin/env bash
set -euo pipefail

# Lando Engine Benchmark Script
# Compares Docker vs containerd performance for common operations.
#
# Usage:
#   ./scripts/benchmark-engines.sh --engine docker --runs 3
#   ./scripts/benchmark-engines.sh --engine containerd --runs 5
#   ./scripts/benchmark-engines.sh --engine both
#
# Operations benchmarked:
#   1. Image pull (alpine:latest)
#   2. Container run (echo hello)
#   3. Container list (ps)
#
# Results are written to a markdown file in /tmp.

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
ENGINE="both"
RUNS=3
RESULTS_FILE="/tmp/lando-benchmark-$(date +%s).md"
LANDO_DIR="${LANDO_DIR:-$HOME/.lando}"

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --engine)
      ENGINE="$2"
      shift 2
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --output)
      RESULTS_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--engine docker|containerd|both] [--runs N] [--output FILE]"
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
DOCKER_BIN="${DOCKER_BIN:-docker}"
FINCH_SOCK="${FINCH_SOCK:-/run/lando/finch.sock}"
IMAGE="alpine:latest"

# Time a command in milliseconds using bash built-in SECONDS or date
# Returns milliseconds to stdout
time_ms() {
  local start end
  start=$(date +%s%N 2>/dev/null || echo 0)
  "$@" >/dev/null 2>&1
  end=$(date +%s%N 2>/dev/null || echo 0)
  echo $(( (end - start) / 1000000 ))
}

# Calculate mean of space-separated numbers
calc_mean() {
  local nums=("$@")
  local sum=0
  for n in "${nums[@]}"; do
    sum=$((sum + n))
  done
  echo $((sum / ${#nums[@]}))
}

# Calculate median of space-separated numbers
calc_median() {
  local sorted
  sorted=($(printf '%s\n' "$@" | sort -n))
  local count=${#sorted[@]}
  local mid=$((count / 2))
  if (( count % 2 == 0 )); then
    echo $(( (sorted[mid - 1] + sorted[mid]) / 2 ))
  else
    echo "${sorted[$mid]}"
  fi
}

# ---------------------------------------------------------------------------
# Benchmark a single engine
# ---------------------------------------------------------------------------
benchmark_engine() {
  local engine_name="$1"
  local cli_cmd="$2"
  local cli_args=("${@:3}")

  echo "## ${engine_name}" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"

  local pull_times=()
  local run_times=()
  local ps_times=()

  for i in $(seq 1 "$RUNS"); do
    echo "  Run ${i}/${RUNS} for ${engine_name}..."

    # Clean up image before pull test to ensure a fresh pull
    "$cli_cmd" "${cli_args[@]}" rmi "$IMAGE" >/dev/null 2>&1 || true

    # 1. Image pull
    local t
    t=$(time_ms "$cli_cmd" "${cli_args[@]}" pull "$IMAGE")
    pull_times+=("$t")

    # 2. Container run
    t=$(time_ms "$cli_cmd" "${cli_args[@]}" run --rm "$IMAGE" echo hello)
    run_times+=("$t")

    # 3. Container list
    t=$(time_ms "$cli_cmd" "${cli_args[@]}" ps)
    ps_times+=("$t")
  done

  # Calculate stats
  local pull_mean pull_median run_mean run_median ps_mean ps_median
  pull_mean=$(calc_mean "${pull_times[@]}")
  pull_median=$(calc_median "${pull_times[@]}")
  run_mean=$(calc_mean "${run_times[@]}")
  run_median=$(calc_median "${run_times[@]}")
  ps_mean=$(calc_mean "${ps_times[@]}")
  ps_median=$(calc_median "${ps_times[@]}")

  # Write results table
  cat >> "$RESULTS_FILE" <<EOF
| Operation | Mean (ms) | Median (ms) | Raw (ms) |
|-----------|-----------|-------------|----------|
| Image pull (\`${IMAGE}\`) | ${pull_mean} | ${pull_median} | ${pull_times[*]} |
| Container run (\`echo hello\`) | ${run_mean} | ${run_median} | ${run_times[*]} |
| Container list (\`ps\`) | ${ps_mean} | ${ps_median} | ${ps_times[*]} |

EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo "Lando Engine Benchmark"
echo "======================"
echo "Runs: ${RUNS}"
echo "Engine: ${ENGINE}"
echo "Results: ${RESULTS_FILE}"
echo ""

# Write markdown header
cat > "$RESULTS_FILE" <<EOF
# Lando Engine Benchmark Results

- **Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Host**: $(uname -s) $(uname -r) $(uname -m)
- **Runs per operation**: ${RUNS}

EOF

# Docker benchmark
if [[ "$ENGINE" == "docker" || "$ENGINE" == "both" ]]; then
  if command -v "$DOCKER_BIN" >/dev/null 2>&1; then
    echo "Benchmarking Docker..."
    benchmark_engine "Docker" "$DOCKER_BIN"
  else
    echo "WARNING: docker not found, skipping Docker benchmark." >&2
    echo "## Docker" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "_Skipped: \`docker\` binary not found._" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
  fi
fi

# containerd (via finch-daemon Docker API) benchmark
if [[ "$ENGINE" == "containerd" || "$ENGINE" == "both" ]]; then
  if [[ -S "$FINCH_SOCK" ]]; then
    echo "Benchmarking containerd (docker cli via finch-daemon)..."
    # Use docker CLI pointed at finch-daemon — per BRIEF, never shell out to nerdctl
    export DOCKER_HOST="unix://${FINCH_SOCK}"
    benchmark_engine "containerd (finch-daemon)" "$DOCKER_BIN"
    unset DOCKER_HOST
  else
    echo "WARNING: finch-daemon socket not found at ${FINCH_SOCK}, skipping containerd benchmark." >&2
    echo "## containerd (finch-daemon)" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "_Skipped: finch-daemon socket not found at \`${FINCH_SOCK}\`._" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
  fi
fi

# Clean up test image from both engines
"$DOCKER_BIN" rmi "$IMAGE" >/dev/null 2>&1 || true
DOCKER_HOST="unix://${FINCH_SOCK}" "$DOCKER_BIN" rmi "$IMAGE" >/dev/null 2>&1 || true

echo ""
echo "Done! Results written to: ${RESULTS_FILE}"
echo ""
cat "$RESULTS_FILE"
