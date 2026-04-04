# containerd Engine Performance

This document covers performance characteristics of the containerd backend compared to the Docker backend, and how to benchmark them.

## Benchmark Script

The benchmark script at `scripts/benchmark-engines.sh` measures three core operations:

| Operation | What It Measures |
|-----------|-----------------|
| **Image pull** | Downloads `alpine:latest` from a registry. Measures registry I/O and image unpacking speed. The image is removed before each pull to ensure a fresh download. |
| **Container run** | Runs `echo hello` in a fresh container and removes it (`--rm`). Measures container creation, execution, and teardown overhead. |
| **Container list** | Runs `ps` to list containers. Measures daemon response time for metadata queries. |

### Usage

```bash
# Compare both engines (3 runs each, default)
./scripts/benchmark-engines.sh

# Benchmark only containerd with 5 runs
./scripts/benchmark-engines.sh --engine containerd --runs 5

# Benchmark only Docker, output to a specific file
./scripts/benchmark-engines.sh --engine docker --runs 3 --output ./results.md
```

Results are written as a markdown table to `/tmp/lando-benchmark-<timestamp>.md` by default.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_BIN` | `docker` | Path to the Docker CLI binary |
| `NERDCTL_BIN` | `~/.lando/bin/nerdctl` | Path to the nerdctl binary |
| `CONTAINERD_SOCK` | `/run/lando/containerd.sock` | Path to the containerd socket |
| `LANDO_DIR` | `~/.lando` | Lando configuration root |

## Known Performance Characteristics

### Linux: containerd avoids Docker Desktop overhead

On Linux, Lando's containerd backend runs natively — there is no Docker Desktop layer, no VM, and no Docker daemon multiplexing. This eliminates several sources of overhead:

- **No Docker daemon**: containerd is a minimal container runtime. Docker adds an additional daemon layer (dockerd) on top of containerd that handles API translation, logging drivers, networking plugins, and more. Bypassing this layer reduces per-operation latency.
- **No Docker Desktop VM**: On macOS and Windows, Docker Desktop runs containers inside a Linux VM (HyperKit / WSL2). On Linux with containerd, containers run directly on the host kernel.
- **Direct socket communication**: nerdctl talks to containerd's gRPC API directly, without the Docker API translation layer.

### Container startup

Container startup time is primarily bounded by:

1. Image layer unpacking (first run only — cached thereafter)
2. Namespace and cgroup setup (kernel overhead, similar for both engines)
3. Network namespace creation (Lando uses CNI with containerd vs. Docker's libnetwork)

In practice, the difference for container startup is small (tens of milliseconds) because both engines ultimately call the same Linux kernel primitives.

### Image operations

Image pull performance is dominated by network I/O and registry latency. The containerd backend uses the same OCI registries and the same content-addressable storage model. Differences are typically negligible.

### BuildKit Cache Optimization

The containerd backend uses BuildKit directly (not via Docker's BuildKit integration). The BuildKit configuration (see Task 24) includes GC policies that manage the build cache:

```toml
[worker.containerd]
  gc = true
  gckeepstorage = 10000  # ~10 GB

  [[worker.containerd.gcpolicy]]
    keepBytes = 1073741824    # 1 GB reserved
    keepDuration = 604800     # 7 days
    all = true

  [[worker.containerd.gcpolicy]]
    keepBytes = 5368709120    # 5 GB reserved
    all = false
```

These GC policies ensure the build cache doesn't grow unbounded while retaining frequently-used layers. This is particularly beneficial for iterative development where the same base images and dependency layers are rebuilt frequently.

### Performance Logging

The containerd daemon includes built-in performance timers (via `utils/perf-timer.js`) that log elapsed time for key operations when debug mode is enabled:

- `up()` — total engine startup time (systemd service check + socket verification)

Enable debug logging with `DEBUG=@lando/*` or by setting `debug: true` in your Lando config to see these timings.

## Benchmark Results

<!-- TODO: Populate with actual benchmark data from CI or local runs -->

_No benchmark results recorded yet. Run `./scripts/benchmark-engines.sh` and paste the output here._

### Example Output

```markdown
# Lando Engine Benchmark Results

- **Date**: 2026-03-14 00:00:00 UTC
- **Host**: Linux 6.x.x x86_64
- **Runs per operation**: 3

## Docker

| Operation | Mean (ms) | Median (ms) | Raw (ms) |
|-----------|-----------|-------------|----------|
| Image pull (`alpine:latest`) | — | — | — |
| Container run (`echo hello`) | — | — | — |
| Container list (`ps`) | — | — | — |

## containerd (nerdctl)

| Operation | Mean (ms) | Median (ms) | Raw (ms) |
|-----------|-----------|-------------|----------|
| Image pull (`alpine:latest`) | — | — | — |
| Container run (`echo hello`) | — | — | — |
| Container list (`ps`) | — | — | — |
```

## Future Work

- **CI integration**: Run benchmarks automatically on tagged releases to track regressions.
- **Application-level benchmarks**: Measure `lando start` / `lando rebuild` end-to-end with a sample app.
- **Memory profiling**: Compare RSS of containerd + buildkitd vs. dockerd + containerd + buildkitd.
- **macOS Lima benchmarks**: Compare containerd-in-Lima vs. Docker Desktop performance on macOS.
