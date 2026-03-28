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
- **Task 33:** CNI directory permissions — `lando setup` now sets group-writable perms on `/etc/cni/net.d/finch`; doctor checks CNI dir; fixed proxy-adapter test
- **Task 32:** Fix BRIEF violations — removed nerdctl shellouts from user-facing code:
  - `hooks/lando-doctor-containerd.js` — removed nerdctl binary check, added docker-compose check
  - `messages/nerdctl-not-found.js` → renamed to `containerd-binaries-not-found.js`
  - `messages/nerdctl-compose-failed.js` → renamed to `compose-failed-containerd.js`
  - `messages/update-nerdctl-warning.js` → renamed/rewritten as `update-containerd-warning.js`
  - `hooks/app-check-containerd-compat.js` — replaced nerdctl compose shellout with docker-compose + DOCKER_HOST check
  - Updated tests: `containerd-messages.spec.js`, `lando-doctor-containerd.spec.js`, `backend-manager.spec.js`, `containerd-integration.spec.js`

---

## Remaining Work

### Test coverage gaps (from "Not Started" list)
- `LimaManager` (`lib/backends/containerd/lima-manager.js`) — no unit tests
- `WslHelper` (`lib/backends/containerd/wsl-helper.js`) — no unit tests
- End-to-end integration test for actual `lando start` via `docker-compose + finch-daemon` path (current integration tests use stubs)
- Smoke test script (`scripts/test-containerd-engine.sh`) tests `nerdctl compose` instead of the production `docker-compose + DOCKER_HOST` path

### Other remaining items
- macOS support (Lima VM integration exists but untested with new architecture)
- Windows non-WSL support
- Plugin compatibility verification
- Installer/packaging updates to bundle containerd stack

---

## Recently Completed

- **Task 35:** Bug fix, test coverage, and dead code cleanup
  - `hooks/lando-setup-containerd-engine-check.js` — **Bug fix:** binary check was looking in `~/.lando/bin/` for `containerd` and `buildkitd`, but they're installed to `/usr/local/lib/lando/bin/` (system binaries). Only `nerdctl` lives in `~/.lando/bin/`. Fixed to use `containerdSystemBinDir` config, matching the setup hook and backend-manager.
  - `test/ensure-cni-network.spec.js` (new) — **23 tests** covering: conflist creation, duplicate detection, CNI conflist JSON structure validation, bridge plugin properties, unique nerdctlID generation, subnet allocation (empty dir, increment past existing, max across multiple, sequential allocation, exhaustion at 255), invalid JSON/non-matching subnet skip, IPAM routes, EACCES/EPERM error handling with user-friendly message, non-permission write errors, non-existent directory handling, debug logging, default/custom cniNetconfPath options.
  - `test/finch-daemon-manager.spec.js` — **Extended from 18 to 34 tests** adding: `_isProcessRunning` (no PID file, invalid PID, running process, ESRCH, EPERM), `start` (early return when running, start args validation), `stop` (no PID file, invalid PID, already gone process, SIGTERM signal), `isRunning` (not running, running without socket, running with socket), `_cleanup` (removes files, handles missing files).
  - `lib/backends/containerd/nerdctl-compose.js` — Marked as **@deprecated** (not used in production; `docker-compose + DOCKER_HOST` is the actual path via `BackendManager._createContainerdEngine()`).
  - `utils/setup-engine-containerd.js` — Marked as **@deprecated** (superseded by `BackendManager._createContainerdEngine()`).
  - `lib/backends/containerd/index.js` — Removed `NerdctlCompose` from public exports; updated JSDoc example to reflect production usage (Dockerode + finch-daemon).
  - `test/containerd-integration.spec.js` — Updated to import `NerdctlCompose` directly instead of from index exports.

- **Task 34:** Comprehensive CNI network config bridging for all compose-defined networks
  - `utils/ensure-compose-cni-networks.js` (new) — Parses compose YAML files and pre-creates CNI conflist files for ALL non-external networks, not just `_default`. Resolves docker-compose-style network names (explicit `name:` property or `${project}_${networkName}` convention). Handles multiple compose files with merge semantics matching docker-compose behavior.
  - `lib/backend-manager.js` — Updated containerd compose wrapper to use `ensureComposeCniNetworks()` instead of single-network `ensureCniNetwork()`. Now ensures CNI configs for the implicit `_default` network PLUS any explicitly defined networks (custom bridge networks, proxy edge networks, etc.) before docker-compose up.
  - `test/ensure-compose-cni-networks.spec.js` (new) — 17 tests covering: default network handling, custom network extraction, explicit `name:` resolution, external network skipping (both `external: true` and compose v2 object syntax), multiple compose file merging, proxy network scenario, deduplication, error handling (missing files, invalid YAML), and CNI conflist content validation (unique subnet allocation).
  - **Fixes the core blocker:** Previously, only `${project}_default` got a CNI conflist in the compose wrapper. Custom networks defined in compose files (e.g. `frontend`, `backend`, proxy `edge`) would fail at container start because the nerdctl OCI hook couldn't find their CNI configs. Now all compose-defined networks are covered.

- **Task 33:** CNI directory permissions — fix EACCES blocker for user-land `ensureCniNetwork()`
  - `hooks/lando-setup-containerd-engine.js` — setup task now runs `chgrp lando` + `chmod g+w` on `/etc/cni/net.d/finch` after creating it
  - Systemd `ExecStartPre` updated to enforce CNI dir permissions on every service start (survives package updates, manual resets)
  - `hasRun` check updated to detect missing CNI permissions (re-running `lando setup` will trigger the fix on existing installs)
  - `hooks/lando-doctor-containerd.js` — added CNI directory permissions check (reports error if dir missing or not group-writable)
  - `test/lando-doctor-containerd.spec.js` — added 2 tests for CNI permission check
  - `test/containerd-proxy-adapter.spec.js` — fixed pre-existing test failure (added mock-fs for CNI directory in `app-add-proxy-2-landonet` hook test)
- **Task 30:** Troubleshooting documentation — `docs/troubleshooting/containerd.md`
  - Covers all 10 error scenarios from message modules
  - Sections: quick diagnostics, containerd/buildkitd/finch-daemon not running, binaries not found, permission denied, socket conflict, compose failures, component updates, macOS Lima issues, CNI networking, logs reference
  - Updated 7 message modules (`containerd-not-running`, `containerd-socket-conflict`, `containerd-binaries-not-found`, `containerd-permission-denied`, `compose-failed-containerd`, `buildkitd-not-running`, `finch-daemon-not-running`) to link to the new troubleshooting page instead of the generic engine config page
