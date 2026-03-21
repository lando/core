# Containerd Engine — Remaining Work

Status of production-readiness tasks. Completed tasks are listed briefly for reference; remaining work is detailed.

---

## Completed Tasks

- **Task 22:** Lima setup hook for macOS `lando setup` — `hooks/lando-setup-containerd-engine-darwin.js`
- **Task 23:** Containerd config file management — `utils/get-containerd-config.js`, tests
- **Task 24:** BuildKit configuration and cache management — `utils/get-buildkit-config.js`, tests
- **Task 25:** Registry authentication — `utils/setup-containerd-auth.js`
- **Task 26:** Volume mount compatibility layer — `utils/resolve-containerd-mount.js`, `hooks/app-check-containerd-mounts.js`, tests
- **Task 27:** Networking parity — `test/containerd-networking.spec.js`, `hooks/app-add-2-landonet.js` (updated for Dockerode)
- **Task 29:** Engine selection UX — `hooks/lando-setup-engine-select.js`, `hooks/lando-doctor-containerd.js`, `docs/config/engine.md`
- **Task 31:** Performance benchmarking — `scripts/benchmark-engines.sh`, `utils/perf-timer.js`, `docs/dev/containerd-performance.md`

---

## Remaining Work

### Task 28: Proxy (Traefik) compatibility

**Goal:** Ensure Lando's Traefik proxy works with the containerd backend.

**Details:**
- Lando runs Traefik as the `landoproxyhyperion5000gandalfedition` container
- Traefik uses the Docker socket to discover containers and their labels
- **Solution (per BRIEF):** Point Traefik at finch-daemon's Docker-compatible socket (`/run/lando/finch.sock`). finch-daemon already provides Docker API v1.43, which is what Traefik expects.
- Create `lib/backends/containerd/proxy-adapter.js` that:
  - Configures Traefik's Docker provider to use `unix:///run/lando/finch.sock`
  - Verifies finch-daemon exposes container labels in Docker API format
  - Handles any label format differences between finch-daemon and Docker
- Update proxy setup hooks to set `DOCKER_HOST` for the Traefik container when engine is containerd
- Test that Traefik discovers containers and routes traffic correctly

**Files to create/modify:**
- `lib/backends/containerd/proxy-adapter.js` (new)
- `hooks/app-init-proxy.js` (modify for containerd compat)
- `docs/dev/containerd-proxy-design.md` (new — document the approach)

---

### Task 30 (partial): Missing troubleshooting doc

**Goal:** Create the troubleshooting documentation.

**Details:**
- All 8 error message modules exist in `messages/`
- Missing: `docs/troubleshooting/containerd.md`

**Files to create:**
- `docs/troubleshooting/containerd.md`

---

### Task 32: Fix BRIEF violations in implemented code

**Goal:** Remove nerdctl shellouts and references from user-facing runtime code per the BRIEF's prime directive.

**Details:**
The BRIEF states: "Never shell out to nerdctl from user-facing code." Several implemented files violate this:

1. **`hooks/lando-doctor-containerd.js`** — Shells out to `nerdctl ps` to check connectivity. Should use Dockerode ping against finch-daemon socket instead.

2. **`messages/nerdctl-not-found.js`** — Assumes nerdctl is a user-facing dependency. nerdctl is only used internally by OCI runtime hooks (invoked as root by systemd). Users should never see this error. Rethink or remove.

3. **`messages/nerdctl-compose-failed.js`** — Says "nerdctl compose is used as the Docker Compose alternative." This contradicts the BRIEF: docker-compose is the compose tool, talking to finch-daemon via `DOCKER_HOST`. Rewrite to reference docker-compose + finch-daemon.

4. **`scripts/benchmark-engines.sh`** — Benchmarks nerdctl directly instead of docker-compose + finch-daemon. The benchmarks should measure the actual runtime path.

5. **`utils/setup-containerd-auth.js`** — Comments reference nerdctl throughout. Auth setup should target docker-compose + finch-daemon (which reads `~/.docker/config.json` natively). Verify the implementation actually works with docker-compose, update comments.

**Files to modify:**
- `hooks/lando-doctor-containerd.js`
- `messages/nerdctl-not-found.js`
- `messages/nerdctl-compose-failed.js`
- `scripts/benchmark-engines.sh`
- `utils/setup-containerd-auth.js`
