> **For any agent working on this feature:** Update this file before you finish your session.
> Add gotchas, move status items, record anything the next agent needs to know.

# Moby-based Lando: Project Goals & Guidelines

## The Problem

Lando's dependency on Docker Desktop is its biggest operational headache. Docker is a moving target — users manage their own Docker versions, Docker Inc. changes licensing and behavior across releases, and version compatibility is a constant support burden. Users who use Docker for other things end up in version conflicts with Lando.

**We want users to never know or care about the containerization tool.** They should be able to use Docker, Podman, whatever they want for their own work without affecting Lando.

## The Solution

Replace Docker Desktop with Lando's **own isolated containerd stack** — bundled, versioned, and managed entirely by Lando. The user's Docker installation is untouched. Lando pins its own runtime version. Version compatibility becomes an internal CI problem, not a user support problem.

This follows the **Finch model** (AWS's approach): bundle containerd + nerdctl + BuildKit + finch-daemon into Lando's own isolated environment with its own sockets, its own data directories, its own everything.

Docker remains available as a fallback engine for users who prefer it.

## Architecture

```
lando setup (one-time, needs root)
    │
    ├── Installs binaries to /usr/local/lib/lando/bin/
    ├── Creates lando-containerd.service (systemd)
    ├── Creates 'lando' group
    └── Starts the service

lando start/stop/build/destroy (daily use, NO root needed)
    │
    ▼
docker-compose ──► finch-daemon ──► containerd + buildkitd
(DOCKER_HOST)      (Docker API)     (/run/lando/ sockets)
```

### The Stack

- **containerd** — Container runtime. Manages images, containers, snapshots.
- **buildkitd** — Image builder. Dockerfile → image via BuildKit.
- **finch-daemon** — Docker API compatibility layer. Translates Docker API calls → containerd operations. This is what lets docker-compose and Dockerode work unchanged.
- **docker-compose** — Same binary used by the Docker engine path. Talks to finch-daemon via `DOCKER_HOST`.
- **runc** — Low-level OCI runtime.
- **nerdctl** — containerd CLI. Used internally by OCI runtime hooks only — NOT by user-facing Lando code.

### Socket Isolation

Everything lives under `/run/lando/`:
- `/run/lando/containerd.sock` — containerd gRPC
- `/run/lando/buildkitd.sock` — buildkitd gRPC
- `/run/lando/finch.sock` — finch-daemon Docker API

This means Lando's containerd coexists peacefully with Docker Desktop, system containerd, Podman, or anything else. No conflicts.

### Platform Strategy

- **Linux/WSL**: Native containerd via systemd service
- **macOS**: Lima VM with containerd (similar to Docker Desktop's VM, but Lando-managed)
- **Windows (non-WSL)**: Not yet implemented

## The Prime Directive: No Sudo After Setup

**`lando setup` is the ONLY command that needs root.** After that, a normal user in the `lando` group does everything — start, stop, build, destroy, rebuild — without ever elevating privileges.

This is the single most important design constraint. Every implementation decision flows from it:

- The systemd service owns all root operations (starting daemons, creating sockets, managing permissions)
- User code talks to sockets (group-accessible, `660` permissions, `lando` group)
- No `sudo`, no `getSudoCommand`, no `run-elevated` in any runtime code path

## Guidelines for All Tasks

### 0. JSDoc type annotations on all touched code

We're planning a TypeScript migration. Any code you write or modify should include **JSDoc type annotations** — the kind that work as real type definitions for VS Code's IntelliSense (`@param`, `@returns`, `@type`, `@typedef`). This means:

- All function parameters and return types documented with `@param` and `@returns`
- Complex objects described with `@typedef` where appropriate
- Class properties annotated with `@type`
- Use `/** */` doc comments, not `//` — VS Code only picks up JSDoc-style

This isn't busywork — it's laying the groundwork so the eventual TS migration is a rename + tighten, not a rewrite.

### 1. Never use sudo in runtime code

If you're writing code that runs during `lando start/stop/build/destroy/rebuild`:
- **No `sudo`**, no `getSudoCommand()`, no `run-elevated()`
- Talk to sockets instead. finch-daemon at `/run/lando/finch.sock` provides the Docker API. buildkitd at `/run/lando/buildkitd.sock` handles builds.
- `sudo` and `run-elevated` are for **setup hooks only** (installing binaries, creating the systemd service)

### 2. Never shell out to nerdctl from user-facing code

nerdctl has a hardcoded rootless check: if you're not root, it fails. There is no workaround from user-land. This was a hard-won lesson.

Instead:
- **Compose operations** → `docker-compose` with `DOCKER_HOST=unix:///run/lando/finch.sock`
- **Container operations** (inspect, list, stop, remove) → Dockerode pointed at finch-daemon
- **Image builds** → `buildctl` directly (talks to buildkitd socket, no rootless check)
- **Image loading** → Dockerode's `loadImage()` via finch-daemon

nerdctl IS used internally by containerd's OCI runtime hooks (invoked as root by the systemd service). That's fine. But Lando's JavaScript code must never invoke it.

### 3. Don't conflict with system-wide containerd

Our sockets, data, and state all live in Lando-specific directories:
- Sockets: `/run/lando/` (not `/run/containerd/`)
- Data: `~/.lando/data/containerd/`
- State: `/run/lando/containerd/` (ephemeral, under RuntimeDirectory)
- Config: `~/.lando/config/`

**Never create symlinks from `/run/containerd/` to our sockets.** That conflicts with system containerd or Docker Desktop. Instead, set `CONTAINERD_ADDRESS=/run/lando/containerd.sock` in the systemd service environment so child processes (including OCI hooks) find our containerd.

### 4. Use finch-daemon as the Docker compatibility bridge

finch-daemon translates Docker API → containerd. This is what makes docker-compose and Dockerode work without modification. Everything that used to talk to Docker's socket now talks to finch's socket.

**Known gap**: finch-daemon creates networks at the Docker API level but doesn't write CNI config files. The nerdctl OCI hook needs CNI configs for container networking. Bridge this gap by pre-creating CNI conflist files before docker-compose creates networks.

### 5. Guard containerd code paths from Docker-era assumptions

Lando's codebase was built for Docker. Many hooks assume Docker is the engine. When the containerd backend is active, these must be skipped:

```js
if (lando.engine?.engineBackend === 'containerd' || lando.config.engine === 'containerd') return;
```

Key files that need guards:
- `lando-autostart-engine.js` — skips Docker autostart
- `lando-reset-orchestrator.js` — skips Docker engine recreation
- `app-reset-orchestrator.js` — skips Docker engine recreation

### 6. Same compose interface, different socket

Both Docker and containerd engines use `lib/compose.js` for generating compose command arrays. The only difference is execution environment:

- **Docker**: `shell.sh([orchestratorBin, ...cmd], opts)`
- **Containerd**: `shell.sh([orchestratorBin, ...cmd], {...opts, env: {DOCKER_HOST: finchSocket}})`

Don't create separate compose command builders. Use the same one with different env vars.

### 7. The systemd service is the single source of root operations

`lando-containerd.service` handles:
- Starting containerd, buildkitd, and finch-daemon
- Creating and permissioning sockets
- Setting environment variables (`CONTAINERD_ADDRESS`, `PATH`)
- Auto-restart on failure

Any new root-level requirement goes into the service unit (via setup hooks), never into runtime code.

### 8. The daemon verifies — it doesn't start

`ContainerdDaemon.up()`:
1. Checks `systemctl is-active --quiet lando-containerd.service`
2. Verifies sockets exist
3. Pings finch-daemon via Dockerode

If the service isn't active → throw an error telling the user to run `lando setup`. Never start processes or spawn daemons from user code.

`ContainerdDaemon.down()` is a no-op on Linux/WSL. The service keeps running for fast restart. Only macOS (Lima VM) actually stops something.

## Current Status

### Working ✅
- Engine detection and backend selection (`containerd` / `docker` / `auto`)
- Systemd service creation and management via `lando setup`
- Image building via buildctl (no sudo)
- Image loading via Dockerode/finch-daemon (no sudo)
- Container inspection via Dockerode/finch-daemon (no sudo)
- Compose operations via docker-compose + `DOCKER_HOST` (no sudo)
- Container creation and network creation (no sudo)
- Container creation with `CONTAINERD_ADDRESS` env var for OCI hooks (no sudo)
- **Container start** via runc + nerdctl OCI hooks (no sudo) — the former "shim deadlock" blocker is resolved
- `lando destroy` (no sudo)
- CNI network config bridging — all compose-defined networks get CNI conflist files pre-created before docker-compose up (covers `_default`, custom named networks, proxy networks, etc.)
- Systemd service sets `NERDCTL_TOML` and `CNI_PATH` env vars so OCI hooks use Lando's isolated CNI paths
- **Outbound internet from containers** — Fixed via corrected CNI plugin chain (removed `tc-redirect-tap`, added `portmap`/`tuning`), systemd service now enables `net.ipv4.ip_forward=1` and creates iptables `LANDO-FORWARD` chain for container subnet traffic
- **CNI conflist migration** — Old conflist files (with `tc-redirect-tap`) are automatically detected and rewritten in-place with the correct plugin chain while preserving subnet/bridge/nerdctlID
- **Multi-container orchestration** — Full `lando start` → running container end-to-end flow verified for multi-service apps. `docker-compose up` via finch-daemon starts all services simultaneously. CNI conflist files pre-created for all networks (default + custom). Inter-container DNS via `/etc/hosts` injection (the `app-add-2-landonet.js` containerd path scans all containers, collects IPs, and injects all aliases into all containers). Verified: multiple services start, each gets an IP from the CNI bridge subnet (`10.4.x.0/24`), cross-container name resolution works via injected `/etc/hosts` entries, services survive stop/restart cycles.

### In Progress 🔧
- (None currently)

### Not Started 📋
- macOS support (Lima VM integration exists but untested with new architecture)
- Windows non-WSL support
- Plugin compatibility verification
- Installer/packaging updates to bundle containerd stack

### Gotchas for Next Agent
- **NERDCTL_TOML env var is CRITICAL for OCI hooks**: finch-daemon injects nerdctl `createRuntime` OCI hooks into every container's OCI spec. These hooks run as root within the systemd service context. Without `NERDCTL_TOML` pointing to Lando's `nerdctl.toml`, the hooks look for `/etc/nerdctl/nerdctl.toml` (doesn't exist), fall back to `/etc/cni/net.d/` for CNI configs, and **self-deadlock** on `/etc/cni/net.d/.nerdctl.lock` (flock acquired on FD N, then re-acquired on FD N+1 — flock is not re-entrant across different file descriptors). The fix: `Environment=NERDCTL_TOML=<path>` in the systemd service. This propagates through finch-daemon's process env into the OCI hook env list.
- **Shim socket directory is hardcoded**: containerd v2's `pkg/shim/util_unix.go` uses `defaults.DefaultStateDir = "/run/containerd"` as a compile-time constant for `SocketAddress()`. ALL containerd instances share `/run/containerd/s/` for shim sockets. Hashes are unique per instance (sha256 of `containerdAddress + namespace + id`), so the sockets don't conflict — but the directory must exist and be writable. The systemd service's `ExecStartPre` creates it with `mkdir -p /run/containerd/s`.
- **State directory is now ephemeral**: Moved from `~/.lando/state/containerd` (persistent) to `/run/lando/containerd` (tmpfs, under `RuntimeDirectory=lando`). This means shim bundles are cleaned on reboot, which is correct — containerd state is transient. Persistent data (images, snapshots) remains in `~/.lando/data/containerd` (the `root` directory).
- **Re-running `lando setup` is required** after this change: The `hasRun` check now verifies the service file contains `/run/containerd/s`, `NERDCTL_TOML=`, and the containerd config has `state = "/run/lando/containerd"`. Existing installs will re-run the setup-containerd-service task automatically.
- `NerdctlCompose` (`lib/backends/containerd/nerdctl-compose.js`) and `setup-engine-containerd.js` are **deprecated dead code**. Production uses `docker-compose + DOCKER_HOST` via `BackendManager._createContainerdEngine()`. The files are kept for reference but removed from the public index exports.
- `FinchDaemonManager.start()` uses destructured `const {spawn} = require('child_process')` — cannot be stubbed with sinon alone; needs `proxyquire` or `rewire` for full spawn-level testing. The lifecycle tests cover `_isProcessRunning`, `stop`, `isRunning`, and `_cleanup` but not the actual `spawn` call.
- `LimaManager._run()` lazily requires `utils/run-command` inside the method body, so the `runCommand` dependency cannot be stubbed without `proxyquire`. Tests stub `_run` on the instance instead, which covers all public method behavior but not the actual CLI invocation.
- The smoke test script (`scripts/test-containerd-engine.sh`) now tests the **production path** (`docker-compose + DOCKER_HOST + finch-daemon`) instead of the deprecated `nerdctl compose` path. It requires `finch-daemon` and `docker-compose` binaries.
- `events.emit` stubs for engine.start() tests **must return Bluebird promises** (not native Promises). `router.eventWrapper` chains `.tap()` which is Bluebird-only. Use `require('../lib/promise').resolve()` in test stubs.
- `datum.opts.env` is **NOT forwarded** through the compose closure. `compose.js`'s `buildShell()` returns `{mode, cstdio, silent}` — no `env` property. The only env vars in the shell opts come from `process.env` and the containerd overrides (`DOCKER_HOST`, `DOCKER_BUILDKIT`, `BUILDKIT_HOST`).
- CNI conflist files are written to `/etc/lando/cni/finch/` with the naming pattern `nerdctl-<networkName>.conflist`. Tests using mock-fs must mock that path.
- The Leia containerd test (`examples/containerd/README.md`) uses `LANDO_ENGINE=containerd` prefix on every `lando` command. This is needed because Leia runs commands in isolation — each line is a fresh shell, so env vars don't persist. The CI workflow uses `auto-setup: false` so `lando setup` runs inside the test itself (same pattern as `setup-linux`).
- **CNI plugin chain is `bridge → portmap → firewall → tuning`**: The old chain included `tc-redirect-tap` which is NOT in the standard `containernetworking/plugins` release (it's from `github.com/awslabs/tc-redirect-tap` and is only needed for Kata/Firecracker VMs). `ensure-cni-network.js` now auto-migrates old conflist files in-place, preserving subnet/bridge/nerdctlID. Tests using mock-fs that create conflist files must use the correct 4-plugin chain or the migration will overwrite them.
- **LANDO-FORWARD iptables chain**: The systemd service creates a `LANDO-FORWARD` chain in ExecStartPre that ACCEPTs traffic from/to `10.4.0.0/16` (the Lando subnet range). This is a belt-and-suspenders safety net — the CNI `firewall` plugin also manages per-container FORWARD rules via its `CNI-FORWARD` chain, but the host's default FORWARD policy may be DROP. The `LANDO-FORWARD` chain is flushed and re-created on each service start.
- **`net.ipv4.ip_forward=1` is set by the systemd service**: ExecStartPre runs `sysctl -w net.ipv4.ip_forward=1`. The CNI bridge plugin with `isGateway: true` also enables this per-container, but setting it in the service ensures it's enabled before any container starts and survives across container restarts.
- **`hasRun` check now verifies `ip_forward` and `LANDO-FORWARD`**: The setup-containerd-service task's `hasRun` checks for `net.ipv4.ip_forward=1` and `LANDO-FORWARD` in the service file content. Old service files without these will trigger automatic re-setup on the next `lando setup`.
- **System containerd can coexist**: Lando's containerd shares `/run/containerd/s/` (shim sockets) and `/run/containerd/runc/` (runc state) with system containerd. Hashes/namespaces are unique, so there's no conflict. The `NERDCTL_TOML` env var ensures OCI hooks use Lando's CNI paths, not the system's.
- **Sinon `.withArgs().returns()` chaining pitfall**: Do NOT chain `sinon.stub().withArgs('a').returns(x).withArgs('b').returns(y)` — the second `.withArgs()` operates on the behavior object returned by `.returns()`, not the original stub. Both args will return the LAST value. Instead, use separate lines: `const s = sinon.stub(); s.withArgs('a').returns(x); s.withArgs('b').returns(y);`
- **Inter-container DNS on containerd uses `/etc/hosts`, not Docker DNS**: The containerd path in `app-add-2-landonet.js` does NOT use Docker's built-in DNS (containers are not reconnected to `lando_bridge_network` via Docker API). Instead, it scans each container's IP from the `nerdctl/networks` label + `unknown-ethN` mapping and injects all `<service>.<project>.internal` aliases into every container's `/etc/hosts` via Dockerode exec. This means: (1) aliases only update on `lando start`, not dynamically; (2) if a container's IP changes (e.g., after restart), the hosts file is re-injected on the next `post-start`; (3) the `getContainerdNetworkIP()` function prefers IPs from `lando_bridge_network` > `${project}_default` > `proxyNet`, but in practice only `${project}_default` is in the `nerdctl/networks` label.
- **finch-daemon doesn't persist Docker API network labels across restarts**: When the `lando-containerd.service` restarts, all networks lose their `com.docker.compose.*` labels. docker-compose v2 validates these labels and refuses to start if they're missing/wrong. Fix: `removeStaleComposeNetworks()` removes unlabeled project networks before compose up. Additionally, finch-daemon auto-reports Docker API networks (without labels) for any CNI conflist file it discovers, so `removeComposeCniConflists()` removes conflist files before network cleanup to prevent ghost networks.
- **CNI portmap plugin rejects HostPort:0**: The standard `portmap` CNI plugin (v1.6.2) validates `hostPort > 0`. Docker handles random port allocation (`-p 0:80`) BEFORE container start, but nerdctl's OCI hook passes `HostPort:0` directly to portmap. Fix: portmap is removed from the CNI conflist plugin chain. Lando uses Traefik proxy for port routing instead. The compose start is split into two phases (`up --no-start` + conflist overwrite + `up --detach`) so we can overwrite finch-daemon's conflist (which includes portmap) with our version (without portmap) between network creation and container start.
- **Two-phase compose start for containerd**: The compose closure in `backend-manager.js` splits `docker-compose up` into three steps: (1) `removeComposeCniConflists + removeStaleComposeNetworks` clean up, (2) `docker-compose up --no-start` creates networks and containers, (3) `ensureComposeCniNetworks` overwrites finch-daemon's conflist, (4) `docker-compose up --detach --no-recreate` starts containers. This is necessary because finch-daemon writes conflist files with portmap during network creation, and we can't modify them between creation and start in a single compose up.

### Recently Completed
- **Task 41: Multi-container orchestration verification + finch-daemon fixes** — Verified and fixed docker-compose multi-container flows on the containerd backend. **Two finch-daemon issues fixed**: (1) finch-daemon doesn't persist Docker API network labels across restarts, causing docker-compose v2 to reject existing networks ("not created by compose"). Fix: `removeStaleComposeNetworks()` removes unlabeled project networks before compose up, and `removeComposeCniConflists()` removes CNI conflist files that cause finch-daemon to auto-report ghost networks. (2) finch-daemon writes CNI conflist files that include the `portmap` plugin, which fails on `HostPort:0` (random port) — Docker handles this via port allocation before container start, but nerdctl's OCI hook passes it directly to portmap. Fix: two-phase compose start — Phase 1 runs `docker-compose up --no-start` (creates networks/containers), Phase 2 overwrites conflist files to remove portmap (Lando proxy handles port publishing), Phase 3 runs `docker-compose up --detach --no-recreate` (starts containers). **Architecture confirmation**: `app-add-2-landonet.js` containerd path scans all containers post-start, collects IPs from the `nerdctl/networks` label + `unknown-ethN` interface mapping, and injects all aliases into all containers' `/etc/hosts` via Dockerode exec. **Test coverage added**: (1) 11 new unit tests in `test/app-add-2-landonet.spec.js`. (2) 4 new integration tests in `test/containerd-compose-start.spec.js`. (3) Enhanced Leia E2E test with multi-container verification. **Verified live**: both web (nginx:1.22.1) and web2 (nginx-unprivileged:1.26.1) containers start and serve content via docker-compose exec. All 737 tests pass (0 failing).
- **Task 40: Fix outbound internet from containers** — Root-caused and fixed the outbound connectivity blocker. **Root cause**: The CNI conflist plugin chain included `tc-redirect-tap`, which is from a separate AWS Labs repository (`github.com/awslabs/tc-redirect-tap`) and is NOT included in the `containernetworking/plugins` v1.6.2 release that `lando setup` installs. This plugin is only needed for VM-based runtimes (Kata, Firecracker), not standard runc containers. Its presence in the chain caused the CNI ADD operation to fail or produce incomplete networking (bridge created but iptables FORWARD/MASQUERADE rules not properly applied). **Three-part fix**: (1) Replaced the CNI plugin chain from `[bridge, firewall, tc-redirect-tap]` to `[bridge, portmap, firewall, tuning]` — all plugins that are actually installed and appropriate for runc. Added `portmap` for port publishing support and `tuning` for sysctl/veth tuning. (2) Added `sysctl -w net.ipv4.ip_forward=1` and a `LANDO-FORWARD` iptables chain to the systemd service's `ExecStartPre` — ensures IP forwarding is enabled and FORWARD chain accepts Lando subnet traffic regardless of host firewall policy. (3) Added conflist migration logic: existing conflist files with the old plugin chain are automatically detected and rewritten in-place while preserving subnet, bridge name, and nerdctlID. Updated `hasRun` check to detect old service files. All 722 tests pass (net +9 new tests: 7 migration tests, 3 plugin chain tests, -1 replaced test).
- **Task 39: OCI hook deadlock fix — containers now start** — Root-caused and fixed the "get state: context deadline exceeded" blocker that prevented all container starts. **Root cause**: finch-daemon injects `nerdctl internal oci-hook createRuntime` hooks into OCI specs. These hooks run as root and look for nerdctl config at `/etc/nerdctl/nerdctl.toml` (the root default). Since this file didn't exist, nerdctl fell back to `/etc/cni/net.d/` for CNI config and locked `/etc/cni/net.d/.nerdctl.lock`. A bug in nerdctl's lock handling causes a self-deadlock: it acquires flock on one FD, then tries to acquire it again on a different FD to the same file (flock is not re-entrant across FDs). This blocked `runc create` → shim → containerd indefinitely. **Fix**: Added `Environment=NERDCTL_TOML=<path>` and `Environment=CNI_PATH=<path>` to the systemd service unit. These env vars propagate through finch-daemon into the OCI hook env, directing nerdctl to use `/etc/lando/cni/` for CNI configs instead of the system directory. The `hasRun` check now verifies `NERDCTL_TOML=` is present in the service file, forcing re-setup on existing installs. **Verified**: containers start, tasks reach RUNNING status, eth0 gets IP from CNI bridge (10.4.0.0/24), gateway ping works. Added 6 new tests to `get-nerdctl-config.spec.js` (713 total, 0 failing).
- **Task 38: State directory fix and shim investigation** — Investigated the "get state: context deadline exceeded" blocker. Key findings: (1) containerd v2's shim socket path is hardcoded to `/run/containerd/s/<hash>` via compile-time constant `DefaultStateDir` in `pkg/shim/util_unix.go` — no config can change it. Hashes include the containerd address so sockets are unique per instance. (2) **The failure is NOT caused by system containerd coexistence** — tested with system containerd stopped, same result. The shim creates its socket and containerd connects to it, but runc never starts the container (no `init.pid`). The actual root cause is in runc/shim/OCI-hook interaction, not socket conflicts. Fixes applied: moved containerd `state` from `~/.lando/state/containerd` (persistent) to `/run/lando/containerd` (tmpfs) — prevents stale-bundle issues after reboots. Added `mkdir -p /run/containerd/s` to `ExecStartPre`. Fixed `_ensureDirectories()` to not attempt mkdir on root-owned `/run/lando/containerd`. Updated hasRun checks to detect old configs. All 707 tests pass.
- **Task 37: End-to-end `lando start` integration tests for containerd backend** — Two layers of test coverage:
  - **Mocha (stub-based):** 44 tests in `test/containerd-compose-start.spec.js` covering the production compose closure in `BackendManager._createContainerdEngine()`. Tests cover 8 areas: env injection, shell.sh() invocation, CNI network bridging (mock-fs verified), all compose commands, Bluebird Proxy wrapping, full engine.start() → router.eventWrapper → compose flow, Docker/containerd parity, binary path resolution.
  - **Leia (real containers):** `examples/containerd/README.md` — full end-to-end test exercising `LANDO_ENGINE=containerd lando setup -y` → binary installation → systemd service → socket availability → `lando start` → container lifecycle (list, exec, stop, restart) → `lando destroy`. CI workflow at `.github/workflows/pr-containerd-tests.yml` (mirrors `pr-setup-linux-tests.yml` pattern with `auto-setup: false`).
- **Task 36: LimaManager + WslHelper unit tests and smoke test update** — Added 60 tests for `LimaManager` covering all 10 methods (constructor, `vmExists`, `createVM`, `startVM`, `stopVM`, `isRunning`, `getSocketPath`, `exec`, `nerdctl`, `_parseListOutput`). Added 19 tests for `WslHelper` covering all 3 methods (`isWsl`, `isDockerDesktopRunning`, `ensureSocketPermissions`). Rewrote smoke test script to exercise the production `docker-compose + finch-daemon` path instead of deprecated `nerdctl compose`.
- **Task 35: Bug fix, test coverage, and dead code cleanup** — Fixed binary path bug in `lando-setup-containerd-engine-check.js` (was checking `~/.lando/bin/` instead of `/usr/local/lib/lando/bin/` for system binaries). Added 23 new tests for `ensure-cni-network.js` covering conflist creation, subnet allocation, error handling. Extended `finch-daemon-manager.spec.js` from 18 to 34 tests covering `_isProcessRunning`, `start`, `stop`, `isRunning`, `_cleanup`. Deprecated unused `NerdctlCompose` and `setup-engine-containerd.js`; removed `NerdctlCompose` from public exports.
- **Task 34: Comprehensive CNI network config bridging** — Created `utils/ensure-compose-cni-networks.js` to parse compose YAML files and pre-create CNI conflist files for ALL non-external networks before docker-compose up. Updated `lib/backend-manager.js` compose wrapper to use this instead of single-network `ensureCniNetwork()`. Previously only `${project}_default` got a CNI config; now custom networks (e.g. `frontend`, `backend`, proxy `edge`) are covered. 17 new tests in `test/ensure-compose-cni-networks.spec.js`. This resolves the "compose-created networks need CNI conflist files" item from the In Progress list.
- **Task 33: CNI directory permissions** — Fixed the EACCES blocker: `lando setup` now sets `chgrp lando` + `chmod g+w` on `/etc/cni/net.d/finch` so `ensureCniNetwork()` can write conflist files from user-land without sudo. Permissions are also enforced on every systemd service start via `ExecStartPre`. The `hasRun` check detects missing permissions so re-running `lando setup` will fix existing installs. Added CNI directory permission check to `lando doctor`. Fixed pre-existing test failure in `containerd-proxy-adapter.spec.js` (missing mock-fs for CNI directory).
- **Task 30: Troubleshooting documentation** — Created `docs/troubleshooting/containerd.md` covering all 10 error scenarios. Updated 7 message modules to link to specific troubleshooting sections instead of the generic engine config page.
- **Task 28: Proxy (Traefik) compatibility** — Traefik proxy now works with containerd backend via finch-daemon's Docker API. Created `proxy-adapter.js` for CNI pre-creation and compatibility checks. Fixed `app-add-proxy-2-landonet.js` to no longer skip containerd (uses Dockerode-compatible getNetwork). Updated `app-start-proxy.js` to ensure proxy CNI networks. finch-daemon verified compatible: ping, events API, and label format all pass. See `docs/dev/containerd-proxy-design.md`. **Known caveat:** end-to-end test blocked by Docker Desktop's WSL proxy binding ports 80/443.
- **Task 32: BRIEF violation cleanup** — Removed all nerdctl shellouts from user-facing code. Renamed misleading `nerdctl-*` message files. Fixed `app-check-containerd-compat.js` to use docker-compose + DOCKER_HOST instead of `nerdctl compose`. Updated all related tests. (See `todo.md` for full file list.)
