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
- **Task 28:** Proxy (Traefik) compatibility with containerd backend:
  - `lib/backends/containerd/proxy-adapter.js` (new) — CNI pre-creation, finch-daemon compat checks
  - `lib/backends/containerd/index.js` — added ContainerdProxyAdapter export
  - `hooks/app-add-proxy-2-landonet.js` — removed containerd early return; added CNI ensurance for bridge net
  - `hooks/app-start-proxy.js` — added proxy CNI network pre-creation and app proxy network ensurance for containerd
  - `docs/dev/containerd-proxy-design.md` (new) — architecture documentation
  - `test/containerd-proxy-adapter.spec.js` (new) — 14 tests covering proxy-adapter and hook changes
  - **Verified:** finch-daemon passes all Traefik compat checks (ping, events API, label format)
  - **Known caveats:** End-to-end `lando start` blocked by Docker Desktop WSL proxy (ports 80/443) and CNI dir permissions (pre-existing issues, not Task 28 specific)
- **Task 32:** Fix BRIEF violations — removed nerdctl shellouts from user-facing code:
  - `hooks/lando-doctor-containerd.js` — removed nerdctl binary check, added docker-compose check
  - `messages/nerdctl-not-found.js` → renamed to `containerd-binaries-not-found.js`
  - `messages/nerdctl-compose-failed.js` → renamed to `compose-failed-containerd.js`
  - `messages/update-nerdctl-warning.js` → renamed/rewritten as `update-containerd-warning.js`
  - `hooks/app-check-containerd-compat.js` — replaced nerdctl compose shellout with docker-compose + DOCKER_HOST check
  - Updated tests: `containerd-messages.spec.js`, `lando-doctor-containerd.spec.js`, `backend-manager.spec.js`, `containerd-integration.spec.js`

---

## Remaining Work

### Task 30 (partial): Missing troubleshooting doc

**Goal:** Create the troubleshooting documentation.

**Details:**
- All 8 error message modules exist in `messages/`
- Missing: `docs/troubleshooting/containerd.md`

**Files to create:**
- `docs/troubleshooting/containerd.md`
