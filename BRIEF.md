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
- State: `~/.lando/state/containerd/`
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
- Container start with `CONTAINERD_ADDRESS` env var for OCI hooks
- `lando destroy` (no sudo)
- CNI network config bridging — all compose-defined networks get CNI conflist files pre-created before docker-compose up (covers `_default`, custom named networks, proxy networks, etc.)

### In Progress 🔧
- Full `lando start` → running container end-to-end flow (CNI bridging now complete; remaining blockers are Docker Desktop WSL proxy binding ports 80/443 and end-to-end integration testing)

### Not Started 📋
- macOS support (Lima VM integration exists but untested with new architecture)
- Windows non-WSL support
- Remaining test coverage: end-to-end `lando start` integration test (stubs-only currently)
- Plugin compatibility verification
- Installer/packaging updates to bundle containerd stack

### Gotchas for Next Agent
- `NerdctlCompose` (`lib/backends/containerd/nerdctl-compose.js`) and `setup-engine-containerd.js` are **deprecated dead code**. Production uses `docker-compose + DOCKER_HOST` via `BackendManager._createContainerdEngine()`. The files are kept for reference but removed from the public index exports.
- `FinchDaemonManager.start()` uses destructured `const {spawn} = require('child_process')` — cannot be stubbed with sinon alone; needs `proxyquire` or `rewire` for full spawn-level testing. The lifecycle tests cover `_isProcessRunning`, `stop`, `isRunning`, and `_cleanup` but not the actual `spawn` call.
- `LimaManager._run()` lazily requires `utils/run-command` inside the method body, so the `runCommand` dependency cannot be stubbed without `proxyquire`. Tests stub `_run` on the instance instead, which covers all public method behavior but not the actual CLI invocation.
- The smoke test script (`scripts/test-containerd-engine.sh`) now tests the **production path** (`docker-compose + DOCKER_HOST + finch-daemon`) instead of the deprecated `nerdctl compose` path. It requires `finch-daemon` and `docker-compose` binaries.

### Recently Completed
- **Task 36: LimaManager + WslHelper unit tests and smoke test update** — Added 60 tests for `LimaManager` covering all 10 methods (constructor, `vmExists`, `createVM`, `startVM`, `stopVM`, `isRunning`, `getSocketPath`, `exec`, `nerdctl`, `_parseListOutput`). Added 19 tests for `WslHelper` covering all 3 methods (`isWsl`, `isDockerDesktopRunning`, `ensureSocketPermissions`). Rewrote smoke test script to exercise the production `docker-compose + finch-daemon` path instead of deprecated `nerdctl compose`.
- **Task 35: Bug fix, test coverage, and dead code cleanup** — Fixed binary path bug in `lando-setup-containerd-engine-check.js` (was checking `~/.lando/bin/` instead of `/usr/local/lib/lando/bin/` for system binaries). Added 23 new tests for `ensure-cni-network.js` covering conflist creation, subnet allocation, error handling. Extended `finch-daemon-manager.spec.js` from 18 to 34 tests covering `_isProcessRunning`, `start`, `stop`, `isRunning`, `_cleanup`. Deprecated unused `NerdctlCompose` and `setup-engine-containerd.js`; removed `NerdctlCompose` from public exports.
- **Task 34: Comprehensive CNI network config bridging** — Created `utils/ensure-compose-cni-networks.js` to parse compose YAML files and pre-create CNI conflist files for ALL non-external networks before docker-compose up. Updated `lib/backend-manager.js` compose wrapper to use this instead of single-network `ensureCniNetwork()`. Previously only `${project}_default` got a CNI config; now custom networks (e.g. `frontend`, `backend`, proxy `edge`) are covered. 17 new tests in `test/ensure-compose-cni-networks.spec.js`. This resolves the "compose-created networks need CNI conflist files" item from the In Progress list.
- **Task 33: CNI directory permissions** — Fixed the EACCES blocker: `lando setup` now sets `chgrp lando` + `chmod g+w` on `/etc/cni/net.d/finch` so `ensureCniNetwork()` can write conflist files from user-land without sudo. Permissions are also enforced on every systemd service start via `ExecStartPre`. The `hasRun` check detects missing permissions so re-running `lando setup` will fix existing installs. Added CNI directory permission check to `lando doctor`. Fixed pre-existing test failure in `containerd-proxy-adapter.spec.js` (missing mock-fs for CNI directory).
- **Task 30: Troubleshooting documentation** — Created `docs/troubleshooting/containerd.md` covering all 10 error scenarios. Updated 7 message modules to link to specific troubleshooting sections instead of the generic engine config page.
- **Task 28: Proxy (Traefik) compatibility** — Traefik proxy now works with containerd backend via finch-daemon's Docker API. Created `proxy-adapter.js` for CNI pre-creation and compatibility checks. Fixed `app-add-proxy-2-landonet.js` to no longer skip containerd (uses Dockerode-compatible getNetwork). Updated `app-start-proxy.js` to ensure proxy CNI networks. finch-daemon verified compatible: ping, events API, and label format all pass. See `docs/dev/containerd-proxy-design.md`. **Known caveat:** end-to-end test blocked by Docker Desktop's WSL proxy binding ports 80/443.
- **Task 32: BRIEF violation cleanup** — Removed all nerdctl shellouts from user-facing code. Renamed misleading `nerdctl-*` message files. Fixed `app-check-containerd-compat.js` to use docker-compose + DOCKER_HOST instead of `nerdctl compose`. Updated all related tests. (See `todo.md` for full file list.)
