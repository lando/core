# Containerd Engine — Next 10 Tasks

Remaining work to make the containerd backend production-ready. Each task is a standalone development unit suitable for a single coding agent pass (implement → review → fix).

---

## Task 22: Lima setup hook for macOS `lando setup`

**Goal:** When running `lando setup` on macOS with `engine: containerd` (or `auto`), automatically install Lima and create the Lando VM.

**Details:**
- Create `hooks/lando-setup-containerd-engine-darwin.js` following the pattern of `hooks/lando-setup-build-engine-darwin.js`
- The hook should add setup tasks that:
  1. Check if `limactl` is installed (via Homebrew or direct binary)
  2. If missing, download and install Lima from GitHub releases (`https://github.com/lima-vm/lima/releases`)
  3. Check if the `lando` Lima VM exists (`limactl list --json`)
  4. If missing, create it with `limactl create --name=lando --containerd=system --cpus=4 --memory=4 --disk=60 template:default --tty=false`
  5. Start the VM if not running
- Add a `hasRun` check that verifies both `limactl` exists AND the `lando` VM is in "Running" state
- Register the hook in `index.js` with a platform guard: only load on `darwin`
- The existing `lando-setup-containerd-engine.js` handles binary downloads — this hook handles the Lima VM layer on top of that
- Reference `lima-manager.js` for the limactl command patterns

**Files to create/modify:**
- `hooks/lando-setup-containerd-engine-darwin.js` (new)
- `index.js` (add hook registration with darwin platform guard)

---

## Task 23: Containerd config file management

**Goal:** Generate and manage a proper `containerd-config.toml` for Lando's isolated containerd instance on all platforms, not just WSL.

**Details:**
- Currently `wsl-helper.js` generates a containerd config only on WSL. This should be generalized.
- Create `utils/get-containerd-config.js` that generates a TOML config for containerd based on platform and options:
  - `grpc.address` = Lando's socket path
  - `state.directory` and `root.path` for isolation
  - Disable CRI plugin (not needed for Lando)
  - Disable overlapping plugins when Docker might coexist
  - Configure the snapshotter (overlayfs on Linux, default on macOS/Lima)
  - Set appropriate log level based on Lando's debug mode
  - Configure content sharing policy for better disk usage
- Update `containerd-daemon.js` to always generate and use a config file (not just on WSL)
- Pass `--config <path>` to containerd on all platforms
- Update `wsl-helper.js` to delegate to the shared config generator instead of having its own implementation
- Add tests for config generation in `test/get-containerd-config.spec.js`

**Files to create/modify:**
- `utils/get-containerd-config.js` (new)
- `test/get-containerd-config.spec.js` (new)
- `lib/backends/containerd/containerd-daemon.js` (modify `_startContainerd`)
- `lib/backends/containerd/wsl-helper.js` (modify to use shared config)

---

## Task 24: BuildKit configuration and cache management

**Goal:** Configure BuildKit optimally for Lando's use case and manage build caches.

**Details:**
- Create `utils/get-buildkit-config.js` that generates a BuildKit TOML config:
  - Use containerd worker (not OCI worker) pointed at Lando's containerd socket
  - Configure build cache location at `~/.lando/cache/buildkit/`
  - Set garbage collection policies (keep cache under a configurable max, default 10GB)
  - Configure parallel build settings based on available CPUs
  - Set registry mirrors if configured in Lando config (`config.registry`)
- Update `containerd-daemon.js` `_startBuildkitd()` to:
  - Generate and write the BuildKit config before starting
  - Pass `--config <path>` to buildkitd
  - Add a `pruneBuildCache()` method that calls `buildctl prune` to free disk space
- Add a `lando cleanup` integration that calls `pruneBuildCache()` when engine is containerd
- Add `config.buildkitCacheMax` to defaults (default: `'10GB'`)
- Add tests for config generation

**Files to create/modify:**
- `utils/get-buildkit-config.js` (new)
- `test/get-buildkit-config.spec.js` (new)
- `lib/backends/containerd/containerd-daemon.js` (modify `_startBuildkitd`, add `pruneBuildCache`)
- `utils/get-config-defaults.js` (add `buildkitCacheMax`)

---

## Task 25: Image pull and registry authentication

**Goal:** Ensure `nerdctl pull` and `nerdctl compose pull` work with private registries and Docker Hub authentication.

**Details:**
- Lando users pull from Docker Hub (rate limits apply) and private registries
- Create `utils/setup-containerd-auth.js` that:
  - Reads Docker's `~/.docker/config.json` for existing auth credentials
  - Converts Docker auth format to nerdctl-compatible format if needed (nerdctl uses the same `~/.docker/config.json` by default, but verify this works with Lando's isolated containerd)
  - Handles credential helpers (`docker-credential-osxkeychain`, `docker-credential-desktop`, etc.)
  - Sets `DOCKER_CONFIG` environment variable for nerdctl commands if auth config is in a non-standard location
- Update `NerdctlCompose._transform()` to inject `DOCKER_CONFIG` into the command environment when auth is configured
- Update `ContainerdContainer._nerdctl()` to also respect auth configuration
- Add a `config.registryAuth` option to point to custom auth config
- Test with Docker Hub pull (rate-limited) and verify auth headers are sent

**Files to create/modify:**
- `utils/setup-containerd-auth.js` (new)
- `lib/backends/containerd/nerdctl-compose.js` (modify `_transform` for auth env)
- `lib/backends/containerd/containerd-container.js` (modify `_nerdctl` for auth)
- `utils/get-config-defaults.js` (add `registryAuth`)

---

## Task 26: Volume mount compatibility layer

**Goal:** Ensure Lando volume mounts work correctly with containerd, especially on macOS (Lima) and WSL.

**Details:**
- Docker Desktop handles host-to-container file sharing transparently. With containerd:
  - **Linux:** bind mounts work natively, no issues
  - **macOS (Lima):** Lima mounts the host filesystem into the VM, but paths must be mapped. Lima's default mount is `~` → `~` (writable). Verify Lando project dirs (which may be outside `~`) are accessible.
  - **WSL2:** Windows paths via `/mnt/c/` need to work with containerd
- Create `utils/resolve-containerd-mount.js` that:
  - Takes a host path and returns the containerd-visible path
  - On macOS/Lima: verifies the path is within a Lima mount point, warns if not
  - On WSL: handles `/mnt/c/` → Windows path resolution if needed
  - On Linux: passthrough (no transformation)
- Update `NerdctlCompose` to intercept compose file volume definitions and transform paths if needed
- Add a hook that warns users if their project directory isn't accessible from the containerd runtime
- Test mount resolution for each platform

**Files to create/modify:**
- `utils/resolve-containerd-mount.js` (new)
- `test/resolve-containerd-mount.spec.js` (new)
- `lib/backends/containerd/nerdctl-compose.js` (modify for mount resolution)
- `hooks/app-check-containerd-mounts.js` (new — warns about inaccessible mounts)

---

## Task 27: Networking parity with Docker

**Goal:** Ensure Lando's networking model (landonet bridge, proxy, DNS) works identically on containerd.

**Details:**
- Lando creates a `lando_bridge_network` for inter-container communication
- The proxy (Traefik) connects to this network to route traffic
- With nerdctl, verify:
  1. `nerdctl network create` produces Docker-compatible networks
  2. Containers on the same nerdctl network can reach each other by service name (DNS)
  3. nerdctl networks support the `--internal` and `--attachable` flags Lando uses
  4. The Traefik proxy container can attach to nerdctl-created networks
  5. Port publishing (`-p`) works the same as Docker
- Create `test/containerd-networking.spec.js` with integration tests (skippable without containerd):
  - Create a network, start two containers, verify they can ping each other
  - Verify DNS resolution between containers on the same network
  - Verify port publishing from container to host
- Fix any networking differences found in `ContainerdContainer.createNet()`
- Check if nerdctl compose creates the default network with the right settings for Lando's DNS to work
- Update `hooks/app-add-2-landonet.js` if containerd requires different network config

**Files to create/modify:**
- `test/containerd-networking.spec.js` (new)
- `lib/backends/containerd/containerd-container.js` (fix createNet if needed)
- `hooks/app-add-2-landonet.js` (modify if needed for containerd compat)

---

## Task 28: Proxy (Traefik) compatibility

**Goal:** Ensure Lando's Traefik proxy works with the containerd backend.

**Details:**
- Lando runs Traefik as the `landoproxyhyperion5000gandalfedition` container
- Traefik uses the Docker socket to discover containers and their labels
- **Critical issue:** Traefik's Docker provider talks to the Docker socket. With containerd, there is no Docker socket. Options:
  1. Use nerdctl's Docker API compatibility socket (if available)
  2. Switch Traefik to file-based provider and generate config from Lando's state
  3. Use `finch-daemon` to provide a Docker-compatible socket backed by containerd
- Research which approach is most viable and implement it
- Create `lib/backends/containerd/proxy-adapter.js` that handles the Traefik ↔ containerd bridge
- The adapter should:
  - Either expose a Docker-compatible socket for Traefik, OR
  - Generate Traefik file-based config from container labels
  - Watch for container start/stop events and update Traefik config
- Update the proxy setup hooks to use the adapter when engine is containerd
- This is the **hardest compatibility challenge** — Traefik deeply assumes Docker

**Files to create/modify:**
- `lib/backends/containerd/proxy-adapter.js` (new)
- `hooks/app-init-proxy.js` (modify for containerd compat)
- Research doc: `docs/dev/containerd-proxy-design.md` (new)

---

## Task 29: `lando setup` UX for engine selection

**Goal:** Give users a clean interactive experience for choosing and switching between Docker and containerd engines.

**Details:**
- During `lando setup`, if `engine: auto`:
  - Detect what's available (Docker, containerd, neither)
  - If neither: prompt user to choose which to install
  - If Docker exists but containerd doesn't: offer to install containerd as an alternative
  - If containerd exists: use it, mention Docker is also supported
- Create a setup task that:
  - Shows a selection prompt: "Which container engine would you like to use?"
  - Options: "Docker (recommended — wider compatibility)", "containerd (experimental — no Docker dependency)"
  - Writes the selection to `~/.lando/config.yml` as `engine: docker|containerd`
  - Queues the appropriate downstream setup tasks
- Add a `lando config set engine <value>` helper or document how to switch
- Add `lando doctor` checks for the containerd engine:
  - Is containerd running?
  - Is buildkitd running?
  - Can nerdctl compose run a test container?
  - Are all binary versions in supported ranges?
- Update `docs/config/engine.md` with the setup flow and switching instructions

**Files to create/modify:**
- `hooks/lando-setup-engine-select.js` (new)
- `hooks/lando-doctor-containerd.js` (new)
- `docs/config/engine.md` (update with setup flow)

---

## Task 30: Error messages and troubleshooting

**Goal:** Make containerd-related errors user-friendly with clear troubleshooting steps.

**Details:**
- Create `messages/` entries for common containerd errors:
  - `containerd-not-running.js` — "containerd is not running. Run `lando setup` or start it manually with..."
  - `buildkitd-not-running.js` — "BuildKit daemon is not running..."
  - `nerdctl-not-found.js` — "nerdctl binary not found. Run `lando setup` to install it."
  - `lima-not-installed.js` — macOS-specific: "Lima is required for containerd on macOS..."
  - `lima-vm-not-running.js` — "The Lando Lima VM is stopped. Starting it..."
  - `containerd-permission-denied.js` — "containerd requires elevated permissions. Run with sudo or add your user to the appropriate group."
  - `containerd-socket-conflict.js` — "Another containerd instance is using the socket..."
  - `nerdctl-compose-failed.js` — "nerdctl compose failed. This may be due to..."
- Update `ContainerdDaemon.up()` to throw errors using these message modules instead of generic Error messages
- Update `ContainerdDaemon.isUp()` to provide diagnostic info when health check fails
- Update `hooks/lando-setup-containerd-engine-check.js` to use these messages
- Add a `--debug` flag behavior that shows containerd/buildkitd stderr logs when things go wrong (reference the log files at `~/.lando/logs/containerd.log`)
- Create `docs/troubleshooting/containerd.md` with common issues and solutions

**Files to create/modify:**
- `messages/containerd-not-running.js` (new)
- `messages/buildkitd-not-running.js` (new)
- `messages/nerdctl-not-found.js` (new)
- `messages/lima-not-installed.js` (new)
- `messages/lima-vm-not-running.js` (new)
- `messages/containerd-permission-denied.js` (new)
- `messages/containerd-socket-conflict.js` (new)
- `messages/nerdctl-compose-failed.js` (new)
- `lib/backends/containerd/containerd-daemon.js` (modify error handling)
- `hooks/lando-setup-containerd-engine-check.js` (modify to use messages)
- `docs/troubleshooting/containerd.md` (new)

---

## Task 31: Performance benchmarking and optimization

**Goal:** Measure and optimize containerd backend performance relative to Docker.

**Details:**
- Create `scripts/benchmark-engines.sh` that compares Docker vs containerd for:
  1. **Cold start:** Time from `lando start` to services running (no cache)
  2. **Warm start:** Time from `lando start` when images are cached
  3. **Image pull:** Time to pull a standard image (e.g., `node:18`)
  4. **Build:** Time to build a Dockerfile with a typical Lando service
  5. **Exec:** Time for `lando exec` round-trip (run a command in a container)
  6. **File I/O:** Read/write speed from host-mounted volumes
  7. **Network:** HTTP request latency from host to container service
- The script should:
  - Run each benchmark N times (default 5) and report mean/median/p95
  - Output results as a markdown table
  - Support `--engine docker` and `--engine containerd` flags
  - Clean up all containers/networks/volumes between runs
- Create `utils/perf-timer.js` — a lightweight timer utility for programmatic benchmarking:
  - `const timer = perfTimer('label'); ... timer.stop(); // returns ms`
  - Integrate into Engine methods behind a `config.perfLogging` flag
- Add performance logging to `ContainerdDaemon.up()` and `NerdctlCompose.start()` — log time taken when `--debug` is on
- Identify and fix any obvious performance gaps:
  - Is nerdctl compose slower than docker compose? If so, why?
  - Is containerd startup slower than Docker Desktop? Measure and document.
  - Is BuildKit build cache being used effectively?
- Write results to `docs/dev/containerd-performance.md`

**Files to create/modify:**
- `scripts/benchmark-engines.sh` (new)
- `utils/perf-timer.js` (new)
- `docs/dev/containerd-performance.md` (new)
- `lib/backends/containerd/containerd-daemon.js` (add perf logging)
- `lib/backends/containerd/nerdctl-compose.js` (add perf logging)
