'use strict';

/**
 * @module backends
 * @file Engine backend interfaces for Lando's pluggable container runtime support.
 *
 * These base classes define the contracts that any engine backend (Docker, containerd/nerdctl, etc.)
 * must implement. Each class corresponds to a layer of the engine architecture:
 *
 * - **DaemonBackend**: Manages the container engine lifecycle (start, stop, health checks, versions).
 * - **ContainerBackend**: Low-level container and network operations (inspect, list, remove, stop).
 * - **ComposeBackend**: Orchestration commands that operate on compose files and projects (build, start, stop, run, etc.).
 * - **EngineBackend**: Top-level facade that composes a DaemonBackend, ContainerBackend, and ComposeBackend
 *   and exposes all 14 public Engine methods as a unified interface.
 *
 * Subclasses must override every method; the base implementations throw "Not implemented" errors
 * to ensure missing methods are caught early during development.
 *
 * ## Architecture Notes
 *
 * ### Auto-Start Behavior
 *
 * The `Engine` class wraps every command in an `eventWrapper` (see `lib/router.js:27-33`) that
 * ensures the container engine daemon is running before any operation executes. The sequence is:
 *
 * 1. Emit `pre-engine-autostart`
 * 2. Emit `engine-autostart`
 * 3. Call `daemon.up()` — starts the engine if it is not already running
 * 4. Emit `pre-engine-{name}` (e.g. `pre-engine-build`)
 * 5. Execute the actual backend operation
 * 6. Emit `post-engine-{name}` (e.g. `post-engine-build`)
 *
 * This auto-start-on-every-command behavior is owned by the `Engine` layer, **not** by the
 * backend. Backend implementations should assume the daemon is already running when their
 * methods are called. If a backend needs custom pre-flight checks, it should do so internally
 * without relying on the Engine's event wrapper.
 *
 * ### Shell Execution Layer
 *
 * ComposeBackend methods return synchronous `{cmd: string[], opts: Object}` shell descriptors.
 * The actual shell execution is handled by a separate layer — the `compose` function wrapper
 * that `Engine` passes around. This means:
 * - ComposeBackend is **not** responsible for running commands
 * - ComposeBackend builds the command arrays; the shell layer executes them
 * - A containerd/nerdctl backend CAN return the same `{cmd, opts}` shape with different commands
 * - This preserves backward compatibility with the existing shell infrastructure
 *
 * @since 4.0.0
 */

/**
 * Helper that builds a descriptive "Not implemented" error.
 *
 * @param {string} backendName - The name of the backend interface (e.g. "DaemonBackend").
 * @param {string} methodName  - The name of the method that was called.
 * @returns {Error} An error with a helpful message.
 * @private
 */
const notImplemented = (backendName, methodName) => {
  return new Error(
    `${backendName}.${methodName}() is not implemented. ` +
    `Subclasses must override this method to provide a concrete implementation.`,
  );
};

// ---------------------------------------------------------------------------
// DaemonBackend
// ---------------------------------------------------------------------------

/**
 * Base class for daemon / engine-lifecycle backends.
 *
 * A DaemonBackend is responsible for starting and stopping the underlying container engine
 * (e.g. Docker Desktop, the Docker systemd service, or the containerd daemon) and for
 * reporting whether the engine is currently reachable and what versions are installed.
 *
 * **This is an abstract class.** It cannot be instantiated directly — you must extend it
 * and provide concrete implementations of all methods.
 *
 * Concrete implementations must set the following properties in their constructor:
 *
 * | Property     | Type            | Description                                                |
 * |--------------|-----------------|------------------------------------------------------------|
 * | `platform`   | `string`        | The OS platform (`'darwin'`, `'linux'`, `'win32'`, `'wsl'`)|
 * | `isRunning`  | `boolean`       | Whether the engine is believed to be running               |
 * | `events`     | `Events`        | A Lando `Events` instance for lifecycle hooks              |
 * | `compose`    | `string\|false` | Path to the compose binary, or `false` if unavailable      |
 * | `docker`     | `string\|false` | Path to the docker/nerdctl binary, or `false`              |
 *
 * @since 4.0.0
 */
class DaemonBackend {
  /**
   * @throws {Error} If instantiated directly (abstract class guard).
   */
  constructor() {
    if (new.target === DaemonBackend) {
      throw new Error('DaemonBackend is abstract and cannot be instantiated directly. Extend it and provide a concrete implementation.');
    }
  }

  /**
   * Start the container engine.
   *
   * Implementations should:
   * 1. Emit `pre-engine-up` before attempting to start.
   * 2. Detect the current platform and invoke the appropriate start mechanism.
   * 3. Retry according to `retry` settings if the engine is slow to come up.
   * 4. Emit `post-engine-up` once the engine is confirmed reachable.
   *
   * @param {boolean|Object} [retry=true] - Retry configuration. `true` uses default retry
   *   settings (`{max: 25, backoff: 1000}`), `false` disables retries, or pass an object
   *   with `{max, backoff}` for custom settings.
   * @param {string} [password] - Optional sudo password for platforms that need elevated
   *   privileges to start the engine (e.g. Linux systemd service).
   * @returns {Promise<void>} Resolves when the engine is up and reachable.
   * @throws {Error} If the engine cannot be started after all retries.
   */
  async up(retry, password) { // eslint-disable-line no-unused-vars
    throw notImplemented('DaemonBackend', 'up');
  }

  /**
   * Stop the container engine.
   *
   * Implementations should:
   * 1. Emit `pre-engine-down`.
   * 2. Gracefully shut down the container engine (or no-op on platforms where the
   *    engine is shared, e.g. Docker Desktop on macOS/Windows).
   * 3. Emit `post-engine-down`.
   *
   * **Note:** The existing Docker implementation (`LandoDaemon.down()`) is a no-op on
   * macOS, Windows, and WSL — it only actually stops the daemon on Linux in a node
   * context. The `password` parameter may be needed for elevated shutdown on Linux
   * but is not currently part of this signature. Implementations that require sudo
   * should obtain the password from their own configuration.
   *
   * @returns {Promise<void>} Resolves when the engine has been stopped (or the stop
   *   was intentionally skipped).
   */
  async down() {
    throw notImplemented('DaemonBackend', 'down');
  }

  /**
   * Check whether the container engine is currently running and reachable.
   *
   * Implementations typically execute a lightweight command (e.g. `docker ps`) and
   * cache the result with a short TTL to avoid repeated subprocess spawns.
   *
   * **Note:** The `log` parameter that existed in the original `LandoDaemon.isUp()` signature
   * has been removed because it was never used by the implementation. If your implementation
   * needs logging, inject the logger via the constructor instead.
   *
   * @param {Object} [cache] - A Lando Cache instance for short-lived TTL caching.
   *   Defaults to `this.cache` in the existing Docker implementation.
   * @param {string} [docker] - Path to the docker/nerdctl binary to probe.
   *   Defaults to `this.docker` in the existing Docker implementation.
   * @returns {Promise<boolean>} `true` if the engine is reachable, `false` otherwise.
   */
  async isUp(cache, docker) { // eslint-disable-line no-unused-vars
    throw notImplemented('DaemonBackend', 'isUp');
  }

  /**
   * Retrieve version information for the container engine and related tooling.
   *
   * The returned object should include at minimum:
   * - `compose` — The compose/orchestrator version string.
   * - `engine`  — The engine version string (Linux) or `false`.
   * - `desktop` — The desktop app version string (macOS/Windows) or `false`.
   *
   * @returns {Promise<{compose: string, engine: string|false, desktop: string|false}>}
   *   An object containing version strings.
   */
  async getVersions() {
    throw notImplemented('DaemonBackend', 'getVersions');
  }
}

// ---------------------------------------------------------------------------
// ContainerBackend
// ---------------------------------------------------------------------------

/**
 * Base class for low-level container and network operations.
 *
 * A ContainerBackend provides the primitive operations that Lando needs to interact
 * with individual containers and Docker/containerd networks. In the current Docker
 * implementation this is the `Landerode` class (which extends Dockerode).
 *
 * **This is an abstract class.** It cannot be instantiated directly — you must extend it
 * and provide concrete implementations of all methods.
 *
 * Implementations may be backed by Dockerode, nerdctl commands, the containerd gRPC
 * API, or any other container runtime.
 *
 * ### Proxy/Handle Objects
 *
 * `getContainer(cid)` and `getNetwork(id)` return lightweight **proxy/handle objects**,
 * not data. In the Docker implementation (Landerode extends Dockerode), these are
 * Dockerode proxy objects that lazily call the Docker API when you invoke methods on them.
 *
 * The returned container object must support at minimum: `.inspect()`, `.remove(opts)`,
 * `.stop(opts)`.
 *
 * The returned network object must support at minimum: `.inspect()`, `.remove()`.
 *
 * For a containerd backend, these should return objects with compatible method signatures.
 *
 * ### Internal List Method
 *
 * The `list()` method in the Docker implementation internally calls `this.listContainers()`
 * (inherited from Dockerode) to get raw container data, then filters and transforms it.
 * A containerd backend implementing `list()` must include all listing + filtering logic
 * internally — there is no separate `listContainers()` in the interface.
 *
 * @since 4.0.0
 */
class ContainerBackend {
  /**
   * @throws {Error} If instantiated directly (abstract class guard).
   */
  constructor() {
    if (new.target === ContainerBackend) {
      throw new Error('ContainerBackend is abstract and cannot be instantiated directly. Extend it and provide a concrete implementation.');
    }
  }

  /**
   * Create a container network.
   *
   * The network should be created as **attachable** and **internal** by default
   * (matching the current Docker implementation).
   *
   * @param {string} name - The name of the network to create.
   * @param {Object} [opts={}] - Additional network creation options (driver, labels, etc.).
   *   Merged with defaults; see the Docker API `NetworkCreate` spec for available fields.
   * @returns {Promise<Object>} A Promise resolving to network inspect data.
   * @throws {Error} If the network cannot be created.
   */
  async createNet(name, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'createNet');
  }

  /**
   * Inspect a container and return its full metadata.
   *
   * Equivalent to `docker inspect <cid>`.
   *
   * @param {string} cid - A container identifier (hash, name, or short id).
   * @returns {Promise<Object>} A Promise resolving to the container's inspect data.
   * @throws {Error} If the container does not exist or cannot be inspected.
   */
  async scan(cid) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'scan');
  }

  /**
   * Determine whether a container is currently running.
   *
   * Should return `false` (not throw) if the container does not exist, to avoid
   * race conditions when containers are removed between checks.
   *
   * @param {string} cid - A container identifier.
   * @returns {Promise<boolean>} `true` if the container is running, `false` otherwise.
   */
  async isRunning(cid) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'isRunning');
  }

  /**
   * List Lando-managed containers.
   *
   * Implementations must:
   * 1. List all containers (optionally filtered by `options`).
   * 2. Filter to only Lando-managed containers (by label or naming convention).
   * 3. Remove orphaned app containers whose compose source files no longer exist.
   * 4. Support filtering by `options.project`, `options.app`, and `options.filter`.
   *
   * @param {Object} [options={}] - Listing options.
   * @param {boolean} [options.all=false] - Include stopped containers.
   * @param {string} [options.app] - Filter to containers for a specific app name.
   * @param {string} [options.project] - Filter to containers for a specific project name.
   * @param {Array<string>} [options.filter] - Additional `key=value` filters.
   * @param {string} [separator='_'] - The separator used in container naming
   *   (e.g. `'_'` for docker-compose v1, `'-'` for v2).
   * @returns {Promise<Array<Object>>} An array of Lando container descriptor objects,
   *   each containing at minimum `{id, name, app, src, kind, lando, instance, status, running}`.
   */
  async list(options, separator) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'list');
  }

  /**
   * Remove (delete) a container.
   *
   * @param {string} cid - A container identifier.
   * @param {Object} [opts={v: true, force: false}] - Removal options.
   * @param {boolean} [opts.v=true] - Also remove associated anonymous volumes.
   * @param {boolean} [opts.force=false] - Force-remove a running container.
   * @returns {Promise<void>} Resolves when the container has been removed.
   */
  async remove(cid, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'remove');
  }

  /**
   * Stop a running container.
   *
   * @param {string} cid - A container identifier.
   * @param {Object} [opts={}] - Stop options (e.g. `{t: 10}` for timeout in seconds).
   * @returns {Promise<void>} Resolves when the container has been stopped.
   */
  async stop(cid, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'stop');
  }

  /**
   * Get a network handle by its id or name.
   *
   * Returns a lightweight **proxy object** that lazily calls the container engine API
   * when methods are invoked. This does NOT fetch network data — it returns a handle.
   *
   * The returned object must support at minimum:
   * - `.inspect()` — Returns a Promise with the network's metadata.
   * - `.remove()` — Returns a Promise that resolves when the network is removed.
   *
   * In the Docker implementation, this returns a Dockerode `Network` object.
   *
   * @param {string} id - The network id or name.
   * @returns {Object} A network handle object (implementation-specific).
   */
  getNetwork(id) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'getNetwork');
  }

  /**
   * List networks matching the given filter options.
   *
   * @param {Object} [opts={}] - Filter options. See the Docker API `NetworkList`
   *   endpoint for available filters.
   * @returns {Promise<Array<Object>>} An array of network objects.
   */
  async listNetworks(opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'listNetworks');
  }

  /**
   * Get a container handle by its id or name.
   *
   * Returns a lightweight **proxy object** that lazily calls the container engine API
   * when methods are invoked. This does NOT fetch container data — it returns a handle.
   *
   * The returned object must support at minimum:
   * - `.inspect()` — Returns a Promise with the container's metadata.
   * - `.remove(opts)` — Returns a Promise that resolves when the container is removed.
   * - `.stop(opts)` — Returns a Promise that resolves when the container is stopped.
   *
   * In the Docker implementation, this returns a Dockerode `Container` object.
   *
   * @param {string} cid - The container id or name.
   * @returns {Object} A container handle object (implementation-specific).
   */
  getContainer(cid) { // eslint-disable-line no-unused-vars
    throw notImplemented('ContainerBackend', 'getContainer');
  }
}

// ---------------------------------------------------------------------------
// ComposeBackend
// ---------------------------------------------------------------------------

/**
 * Base class for compose/orchestration operations.
 *
 * A ComposeBackend translates high-level orchestration intents (build, start, stop, run, etc.)
 * into shell command descriptors that the Lando shell layer can execute. In the current
 * implementation this maps to `docker-compose` / `docker compose` CLI commands via `lib/compose.js`.
 *
 * **This is an abstract class.** It cannot be instantiated directly — you must extend it
 * and provide concrete implementations of all methods.
 *
 * ### Return Type Convention
 *
 * Each method returns a **synchronous** shell descriptor object:
 *
 * ```js
 * {
 *   cmd: string[],  // The command and arguments to execute (e.g. ['--project-name', 'myapp', ...])
 *   opts: {
 *     mode: string,      // Execution mode (e.g. 'spawn')
 *     cstdio: *,         // Custom stdio configuration
 *     silent: boolean     // Whether to suppress output
 *   }
 * }
 * ```
 *
 * These are **not Promises** — they are plain objects. The shell execution is handled by a
 * separate layer (the `compose` function wrapper that `Engine` passes around). The `compose`
 * wrapper receives the method name and data, calls the appropriate ComposeBackend method to
 * get the `{cmd, opts}` descriptor, then executes it via `lando.shell.sh()`.
 *
 * A containerd/nerdctl backend CAN return the same `{cmd, opts}` shape — just with different
 * command arrays (e.g. `nerdctl compose` instead of `docker compose`). This preserves backward
 * compatibility with the existing shell infrastructure.
 *
 * ### Method Signatures
 *
 * Each method receives:
 * - `compose` — An array of paths to compose files.
 * - `project` — The project name (typically the Lando app name).
 * - `opts`    — An options object whose shape varies per command.
 *
 * @since 4.0.0
 */
class ComposeBackend {
  /**
   * @throws {Error} If instantiated directly (abstract class guard).
   */
  constructor() {
    if (new.target === ComposeBackend) {
      throw new Error('ComposeBackend is abstract and cannot be instantiated directly. Extend it and provide a concrete implementation.');
    }
  }

  /**
   * Build container images for the specified services.
   *
   * Typically pulls base images first, then builds any services that have local Dockerfiles.
   * The router's `build()` handles the pull-then-build sequencing — it calls `compose('pull', datum)`
   * first, then `compose('build', datum)`. Implementations of this method only need to handle
   * the build step itself.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Build options.
   * @param {Array<string>} [opts.services] - Specific services to build (default: all).
   * @param {Array<string>} [opts.local] - Services with local Dockerfiles.
   * @param {boolean} [opts.noCache=false] - Bypass the build cache.
   * @param {boolean} [opts.pull=true] - Pull base images before building.
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the build command.
   */
  build(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'build');
  }

  /**
   * Get the container ID(s) for services in a compose project.
   *
   * Equivalent to `docker-compose ps -q`.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Options (e.g. `{services: ['web']}`).
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the ps command.
   */
  getId(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'getId');
  }

  /**
   * Send a SIGKILL to containers in a compose project.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Kill options.
   * @param {Array<string>} [opts.services] - Specific services to kill.
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the kill command.
   */
  kill(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'kill');
  }

  /**
   * Retrieve log output from containers in a compose project.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Logging options.
   * @param {boolean} [opts.follow=false] - Tail the logs (`-f`).
   * @param {boolean} [opts.timestamps=false] - Include timestamps.
   * @param {Array<string>} [opts.services] - Specific services to get logs from.
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the logs command.
   */
  logs(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'logs');
  }

  /**
   * Pull images for services in a compose project.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Pull options.
   * @param {Array<string>} [opts.services] - Specific services to pull.
   * @param {Array<string>} [opts.pullable] - Services whose images can be pulled
   *   (as opposed to locally-built images).
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the pull command.
   */
  pull(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'pull');
  }

  /**
   * Remove containers (and optionally volumes/networks) for a compose project.
   *
   * When `opts.purge` is `true`, this should perform the equivalent of
   * `docker-compose down` (remove everything). Otherwise, it should use
   * `docker-compose rm`.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Removal options.
   * @param {boolean} [opts.purge=false] - Full teardown (volumes + networks).
   * @param {boolean} [opts.force=true] - Force removal without confirmation.
   * @param {boolean} [opts.volumes=true] - Remove anonymous volumes.
   * @param {Array<string>} [opts.services] - Specific services to remove.
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the remove/down command.
   */
  remove(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'remove');
  }

  /**
   * Execute a command inside a running service container.
   *
   * Equivalent to `docker-compose exec` (not `docker-compose run` — this executes in an
   * already-running container, not a new one). Supports both attached (interactive)
   * and detached execution modes.
   *
   * **Note:** Despite being named `run()`, this maps to `exec` semantics in the Docker
   * implementation. The compose.js code builds a `docker-compose exec` shell command.
   * The naming is retained for backward compatibility.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Run/exec options.
   * @param {Array<string>} opts.cmd - The command and its arguments to execute.
   * @param {Array<string>} [opts.services] - The service to run the command in.
   * @param {string} [opts.user] - User to execute as (e.g. `'root'`, `'node'`, `'uid:gid'`).
   * @param {Object} [opts.environment] - Additional environment variables (`{KEY: 'value'}`).
   * @param {boolean} [opts.detach=false] - Run the command in the background.
   * @param {boolean} [opts.noTTY] - Disable pseudo-TTY allocation.
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the exec command.
   */
  run(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'run');
  }

  /**
   * Start containers for a compose project.
   *
   * Equivalent to `docker-compose up`. By default containers are started in the
   * background with orphan removal enabled.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Start options.
   * @param {Array<string>} [opts.services] - Specific services to start (default: all).
   * @param {boolean} [opts.background=true] - Run in detached mode.
   * @param {boolean} [opts.recreate=false] - Force-recreate containers.
   * @param {boolean} [opts.noRecreate=true] - Do not recreate existing containers.
   * @param {boolean} [opts.removeOrphans=true] - Remove orphaned containers.
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the up command.
   */
  start(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'start');
  }

  /**
   * Stop running containers in a compose project.
   *
   * Equivalent to `docker-compose stop`.
   *
   * @param {Array<string>} compose - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Stop options.
   * @param {Array<string>} [opts.services] - Specific services to stop (default: all).
   * @returns {{cmd: string[], opts: Object}} A shell descriptor for the stop command.
   */
  stop(compose, project, opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('ComposeBackend', 'stop');
  }
}

// ---------------------------------------------------------------------------
// EngineBackend
// ---------------------------------------------------------------------------

/**
 * Top-level engine backend that composes a DaemonBackend, ContainerBackend, and ComposeBackend.
 *
 * This is the primary interface that the Lando `Engine` class consumes. It acts as a **facade**
 * that mirrors all 14 public methods from `Engine` and delegates to the three specialized backends.
 *
 * Concrete implementations (e.g. `DockerBackend`, `ContainerdBackend`) should either:
 *
 * 1. Extend this class and override every method, or
 * 2. Accept concrete `DaemonBackend`, `ContainerBackend`, and `ComposeBackend` instances
 *    in their constructor and rely on the default dispatch implementations provided here.
 *
 * ## Dual-Path Dispatch Pattern
 *
 * Several Engine operations support **two invocation styles** (see `lib/router.js`):
 *
 * 1. **Compose-based**: `{compose: [...], project: 'myapp', opts: {...}}` — routes through
 *    the ComposeBackend (e.g. `docker-compose rm`, `docker-compose ps`).
 * 2. **ID-based**: `{id: 'abc123'}` or `{name: 'myapp_web_1'}` or `{cid: 'abc123'}` — routes
 *    directly to ContainerBackend methods (e.g. `docker.remove()`, `docker.stop()`).
 *
 * The default implementations in this class encode this dispatch logic so that concrete
 * backends inherit sensible defaults. Backends can override individual methods to change
 * the dispatch behavior.
 *
 * ## Auto-Start Behavior
 *
 * The `Engine` layer wraps every call to the backend in an `eventWrapper` that auto-starts
 * the daemon before each operation. Backend methods should **not** attempt to start the daemon
 * themselves — they can assume it is already running when called. See the module-level
 * documentation for the full event sequence.
 *
 * ## Empty-Services Short-Circuit
 *
 * The `Engine` layer short-circuits `start()`, `stop()`, and `destroy()` when
 * `data.opts.services` (or `data.services`) is an empty array — returning `Promise.resolve()`
 * immediately without calling the backend. This is needed because Docker Compose v2 fails
 * when invoked with zero services (unlike v1 which silently no-oped). Backend implementations
 * do NOT need to handle this case; the Engine handles it before delegating.
 *
 * The `Engine` class (`lib/engine.js`) will be updated to accept an `EngineBackend` instance
 * instead of separate daemon/docker/compose dependencies.
 *
 * @since 4.0.0
 */
class EngineBackend {
  /**
   * Create an EngineBackend.
   *
   * @param {Object} [opts={}] - Configuration options.
   * @param {DaemonBackend} [opts.daemon] - The daemon backend instance.
   * @param {ContainerBackend} [opts.container] - The container backend instance.
   * @param {ComposeBackend} [opts.compose] - The compose backend instance.
   */
  constructor({daemon, container, compose} = {}) {
    /**
     * The daemon lifecycle backend.
     * @type {DaemonBackend}
     */
    this.daemon = daemon;

    /**
     * The low-level container operations backend.
     * @type {ContainerBackend}
     */
    this.container = container;

    /**
     * The compose/orchestration backend.
     * @type {ComposeBackend}
     */
    this.compose = compose;
  }

  /**
   * Get the name of this engine backend.
   *
   * Used for logging, configuration selection, and user-facing messages.
   * Subclasses should override to return a descriptive name (e.g. `'docker'`, `'containerd'`).
   *
   * @returns {string} The backend name.
   */
  get name() {
    throw notImplemented('EngineBackend', 'name (getter)');
  }

  /**
   * Verify that the engine backend and all its dependencies are properly installed.
   *
   * Implementations should check for the presence of required binaries (docker/nerdctl,
   * compose tooling, etc.) and return an object describing what is and isn't available.
   *
   * @returns {Promise<{installed: boolean, binaries: Object}>} Installation status.
   */
  async verifyInstallation() {
    throw notImplemented('EngineBackend', 'verifyInstallation');
  }

  // -------------------------------------------------------------------------
  // Facade Methods — Mirror the 14 public methods from Engine (lib/engine.js)
  // -------------------------------------------------------------------------

  /**
   * Build container images for the specified compose object.
   *
   * The default implementation pulls base images first, then builds any services that
   * have local Dockerfiles — matching the behavior in `router.build()`.
   *
   * Dispatches through the compose backend only (no ID-based path for builds).
   *
   * @param {Object} data - A compose object or array of compose objects.
   * @param {Array<string>} data.compose - Paths to docker-compose files.
   * @param {string} data.project - The project/app name.
   * @param {Object} [data.opts] - Build options.
   * @param {Array<string>} [data.opts.services] - Services to build (default: all).
   * @param {boolean} [data.opts.noCache=true] - Bypass the build cache.
   * @param {boolean} [data.opts.pull=true] - Pull base images before building.
   * @returns {Promise<void>}
   */
  async build(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'build');
  }

  /**
   * Create a Docker/container network.
   *
   * Delegates to `this.container.createNet(name)`.
   *
   * @param {string} name - The name of the network to create.
   * @returns {Promise<Object>} A Promise resolving to network inspect data.
   */
  async createNetwork(name) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'createNetwork');
  }

  /**
   * Remove containers for a compose object or a specific container by ID.
   *
   * **Dual-path dispatch:**
   * - If `data.compose` exists → delegates to compose backend (`remove` command).
   * - If `data.id` / `data.name` / `data.cid` exists → delegates to `this.container.remove()`.
   *
   * **Note:** The Engine layer short-circuits this method when `data.opts.services` is an
   * empty array, returning immediately without calling the backend. See the class-level
   * documentation on empty-services short-circuit.
   *
   * @param {Object} data - Remove criteria.
   * @param {string} [data.id] - A docker-recognizable container id or name.
   * @param {Array<string>} [data.compose] - Paths to docker-compose files.
   * @param {string} [data.project] - The project/app name.
   * @param {Object} [data.opts] - Removal options.
   * @param {Array<string>} [data.opts.services] - Services to remove.
   * @param {boolean} [data.opts.volumes=true] - Also remove volumes.
   * @param {boolean} [data.opts.force=false] - Force removal.
   * @param {boolean} [data.opts.purge=false] - Full teardown (implies volumes + force).
   * @returns {Promise<void>}
   */
  async destroy(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'destroy');
  }

  /**
   * Check whether a specific service/container exists.
   *
   * **Dual-path dispatch:**
   * - If `data.compose` exists → uses compose backend `getId` to check for container IDs.
   * - If `data.id` / `data.name` / `data.cid` exists → checks against `this.container.list()`.
   *
   * @param {Object} data - Search criteria.
   * @param {string} [data.id] - A docker-recognizable container id or name.
   * @param {Array<string>} [data.compose] - Paths to docker-compose files.
   * @param {string} [data.project] - The project/app name.
   * @param {Object} [data.opts] - Options.
   * @param {Array<string>} [data.opts.services] - Services to check.
   * @returns {Promise<boolean>} Whether the service/container exists.
   */
  async exists(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'exists');
  }

  /**
   * Get version compatibility information for the engine and related tooling.
   *
   * Retrieves version strings from `this.daemon.getVersions()` and compares them against
   * the supported version ranges from configuration. Returns an array of compatibility
   * info objects.
   *
   * This is Engine-level logic that does semver comparison. The backend provides the raw
   * version data via `DaemonBackend.getVersions()`.
   *
   * @param {Object} [supportedVersions] - Version compatibility configuration keyed by
   *   component name (e.g. `{compose: {min, max, ...}, engine: {min, max, ...}}`).
   * @returns {Promise<Array<Object>>} An array of compatibility info objects, each containing
   *   `{name, version, satisfied, wants, link, ...}`.
   */
  async getCompatibility(supportedVersions) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'getCompatibility');
  }

  /**
   * Get a network handle by its id or name.
   *
   * Delegates to `this.container.getNetwork(id)`. Returns a proxy/handle object,
   * not network data. See ContainerBackend.getNetwork() for details.
   *
   * @param {string} id - The network id or name.
   * @returns {Object} A network handle object.
   */
  getNetwork(id) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'getNetwork');
  }

  /**
   * List networks matching the given filter options.
   *
   * Delegates to `this.container.listNetworks(opts)`.
   *
   * @param {Object} [opts] - Filter options.
   * @returns {Promise<Array<Object>>} An array of network objects.
   */
  async getNetworks(opts) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'getNetworks');
  }

  /**
   * Determine whether a container is currently running.
   *
   * Delegates to `this.container.isRunning(data)` where `data` is a container id string.
   *
   * @param {string} data - A docker-recognizable container id or name.
   * @returns {Promise<boolean>} `true` if running, `false` otherwise.
   */
  async isRunning(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'isRunning');
  }

  /**
   * List all Lando-managed containers, optionally filtered.
   *
   * Delegates to `this.container.list(options, separator)`.
   *
   * @param {Object} [options={}] - Filter options.
   * @param {boolean} [options.all=false] - Include stopped containers.
   * @param {string} [options.app] - Filter by app name.
   * @param {Array<string>} [options.filter] - Additional key=value filters.
   * @param {string} [separator='_'] - Container name separator (config-driven).
   * @returns {Promise<Array<Object>>} An array of Lando container descriptor objects.
   */
  async list(options, separator) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'list');
  }

  /**
   * Get log output from containers in a compose project.
   *
   * Dispatches through the compose backend only (no ID-based path for logs).
   *
   * @param {Object} data - A compose object.
   * @param {Array<string>} data.compose - Paths to docker-compose files.
   * @param {string} data.project - The project/app name.
   * @param {Object} [data.opts] - Logging options.
   * @param {boolean} [data.opts.follow=false] - Tail the logs.
   * @param {boolean} [data.opts.timestamps=true] - Include timestamps.
   * @returns {Promise<void>}
   */
  async logs(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'logs');
  }

  /**
   * Execute a command on a running container.
   *
   * This is the most complex Engine operation. The **full orchestration lifecycle** is managed
   * by the Engine/router layer (see `router.run()` in `lib/router.js:75-106`), **not** by the
   * backend. The backend provides the primitives; the Engine orchestrates them.
   *
   * ### Full `run()` Lifecycle (owned by Engine/router):
   *
   * 1. **Merge CLI env vars** — `opts.environment` is merged with CLI-injected env vars
   *    via `get-cli-env()`.
   * 2. **Escape string commands** — If `data.cmd` is a string, it is shell-escaped into
   *    an array.
   * 3. **Check if container is running** — Calls `container.isRunning(containerId)`.
   * 4. **Start if needed** — If the container is NOT running, calls `start()` first (using
   *    compose backend). The `started` flag tracks whether the container was already running.
   * 5. **Execute the command** — Calls `compose('run', ...)` which maps to `ComposeBackend.run()`
   *    (i.e. `docker-compose exec` semantics).
   * 6. **Conditionally stop** — After execution, if the container was NOT originally running
   *    (or if `opts.last` is true), the container is stopped.
   * 7. **Conditionally remove** — If the container was NOT originally running AND
   *    `opts.autoRemove` is true, the container is destroyed.
   *
   * ### Build Step Flags (`prestart` / `last`):
   *
   * During `lando rebuild`, multiple `run()` calls happen sequentially for build steps.
   * - `opts.prestart = true` — This is a build step, not a user command.
   * - `opts.last = true` — This is the final build step.
   *
   * When `prestart` is true and `last` is false, the container is kept running between
   * build steps to avoid stop/start churn. On the last build step (`last: true`), all
   * containers are stopped (services filter is cleared) to ensure a clean state.
   *
   * ### Backend's Role:
   *
   * The backend only provides the primitives: `container.isRunning()`, `compose.start()`,
   * `compose.run()`, `compose.stop()`, and `compose.remove()`. The orchestration logic
   * (steps 1-7 above) stays in the Engine/router layer.
   *
   * @param {Object} data - A run object.
   * @param {string} data.id - The container id or name to run the command on.
   * @param {string|Array<string>} data.cmd - The command to execute.
   * @param {Object} [data.opts] - Run options.
   * @param {string} [data.opts.mode='collect'] - `'collect'` or `'attach'`.
   * @param {Array<string>} [data.opts.env=[]] - Additional env vars (`KEY=VALUE`).
   * @param {string} [data.opts.user='root'] - User to run as.
   * @param {boolean} [data.opts.detach=false] - Run in background.
   * @param {boolean} [data.opts.autoRemove=false] - Remove container after run.
   * @param {boolean} [data.opts.prestart=false] - Whether this is a build step.
   * @param {boolean} [data.opts.last=false] - Whether this is the final build step.
   * @returns {Promise<void>}
   */
  async run(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'run');
  }

  /**
   * Inspect a container and return comprehensive metadata.
   *
   * **Dual-path dispatch:**
   * - If `data.compose` exists → uses compose backend `getId` to resolve the container ID,
   *   then calls `this.container.scan()` with the resolved ID.
   * - If `data.id` / `data.name` / `data.cid` exists → calls `this.container.scan()` directly.
   *
   * @param {Object} data - Search criteria.
   * @param {string} [data.id] - A docker-recognizable container id or name.
   * @param {Array<string>} [data.compose] - Paths to docker-compose files.
   * @param {string} [data.project] - The project/app name.
   * @param {Object} [data.opts] - Options.
   * @param {Array<string>} [data.opts.services] - Services to scan.
   * @returns {Promise<Object>} Container metadata (inspect data).
   */
  async scan(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'scan');
  }

  /**
   * Start containers for a compose object.
   *
   * Dispatches through the compose backend (`docker-compose up`).
   *
   * **Note:** The Engine layer short-circuits this method when `data.opts.services` is an
   * empty array, returning immediately without calling the backend. See the class-level
   * documentation on empty-services short-circuit.
   *
   * @param {Object} data - A compose object.
   * @param {Array<string>} data.compose - Paths to docker-compose files.
   * @param {string} data.project - The project/app name.
   * @param {Object} [data.opts] - Start options.
   * @param {Array<string>} [data.opts.services] - Services to start (default: all).
   * @param {boolean} [data.opts.background=true] - Run in detached mode.
   * @param {boolean} [data.opts.recreate=false] - Force-recreate containers.
   * @param {boolean} [data.opts.removeOrphans=true] - Remove orphaned containers.
   * @returns {Promise<void>}
   */
  async start(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'start');
  }

  /**
   * Stop containers for a compose object or a specific container by ID.
   *
   * **Dual-path dispatch:**
   * - If `data.compose` exists → delegates to compose backend (`stop` or `kill` command,
   *   depending on `data.kill` flag).
   * - If `data.id` / `data.name` / `data.cid` exists → delegates to `this.container.stop()`.
   *
   * **Note:** The Engine layer short-circuits this method when `data.opts.services` is an
   * empty array, returning immediately without calling the backend. See the class-level
   * documentation on empty-services short-circuit.
   *
   * @param {Object} data - Stop criteria.
   * @param {string} [data.id] - A docker-recognizable container id or name.
   * @param {Array<string>} [data.compose] - Paths to docker-compose files.
   * @param {string} [data.project] - The project/app name.
   * @param {Object} [data.opts] - Stop options.
   * @param {Array<string>} [data.opts.services] - Services to stop (default: all).
   * @returns {Promise<void>}
   */
  async stop(data) { // eslint-disable-line no-unused-vars
    throw notImplemented('EngineBackend', 'stop');
  }
}

module.exports = {DaemonBackend, ContainerBackend, ComposeBackend, EngineBackend};
