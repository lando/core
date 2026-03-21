'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');


/**
 * BackendManager — Factory that creates the right Engine based on config.
 *
 * This is designed as a **drop-in replacement** for `utils/setup-engine.js`.
 * Instead of always creating a Docker-backed Engine, it inspects `config.engine`
 * to choose the appropriate backend:
 *
 * - `"docker"` — Uses DockerDaemon, DockerContainer, DockerCompose (identical to setup-engine.js)
 * - `"containerd"` — Uses ContainerdDaemon, ContainerdContainer, docker-compose via finch-daemon
 * - `"auto"` (default) — Auto-detects: prefers containerd if binaries exist, falls back to Docker
 *
 * ## Usage
 *
 * ```js
 * const BackendManager = require('./backend-manager');
 * const manager = new BackendManager(config, cache, events, log, shell);
 * const engine = manager.createEngine('lando');
 * ```
 *
 * This produces the same `Engine` instance that `setup-engine.js` returns,
 * making it a transparent swap.
 *
 * @since 4.0.0
 */
class BackendManager {
  /**
   * Create a BackendManager.
   *
   * @param {Object} config - The full Lando config object.
   * @param {Object} cache  - A Lando Cache instance.
   * @param {Object} events - A Lando Events instance.
   * @param {Object} log    - A Lando Log instance.
   * @param {Object} shell  - A Lando Shell instance.
   */
  constructor(config, cache, events, log, shell) {
    this.config = config;
    this.cache = cache;
    this.events = events;
    this.log = log;
    this.shell = shell;
    this.debug = require('../utils/debug-shim')(log);
  }

  /**
   * Create an Engine with the appropriate backend.
   *
   * Reads `this.config.engine` to determine which backend to use.
   * Returns a fully wired `Engine` instance ready for use by `lando.engine`.
   *
   * @param {string} [id='lando'] - The Lando instance identifier.
   * @return {Engine} A configured Engine instance.
   */
  createEngine(id = 'lando') {
    const engineType = this.config.engine || 'auto';

    switch (engineType) {
      case 'containerd':
        return this._createContainerdEngine(id);
      case 'docker':
        return this._createDockerEngine(id);
      case 'auto':
      default:
        return this._createAutoEngine(id);
    }
  }

  /**
   * Create a Docker-backed Engine.
   *
   * This replicates the exact logic from `utils/setup-engine.js`:
   * - Instantiates LandoDaemon with the same constructor args
   * - Instantiates Landerode with engineConfig
   * - Creates a compose function that delegates to `lib/compose.js` via `shell.sh()`
   * - Returns `new Engine(daemon, docker, compose, config)`
   *
   * @param {string} id - The Lando instance identifier.
   * @return {Engine} A Docker-backed Engine instance.
   * @private
   */
  _createDockerEngine(id) {
    const Engine = require('./engine');
    const Landerode = require('./docker');
    const LandoDaemon = require('./daemon');
    const dockerCompose = require('./compose');

    const {orchestratorBin, orchestratorVersion, dockerBin, engineConfig} = this.config;

    const docker = new Landerode(engineConfig, id);
    const daemon = new LandoDaemon(
      this.cache,
      this.events,
      dockerBin,
      this.log,
      this.config.process,
      orchestratorBin,
      orchestratorVersion,
      this.config.userConfRoot,
    );

    const compose = (cmd, datum) => {
      const run = dockerCompose[cmd](datum.compose, datum.project, datum.opts || {});
      return this.shell.sh([orchestratorBin].concat(run.cmd), run.opts);
    };

    this.debug('created docker engine backend');
    return new Engine(daemon, docker, compose, this.config);
  }

  /**
   * Create a containerd-backed Engine.
   *
   * Uses ContainerdDaemon and ContainerdContainer from `lib/backends/containerd/`
   * to wire up an Engine that talks to Lando's own isolated containerd + buildkitd
   * stack.
   *
   * Compose operations use docker-compose (the same binary as the Docker path)
   * pointed at finch-daemon's Docker-compatible socket via DOCKER_HOST. This avoids
   * nerdctl's rootless-vs-rootful issues entirely:
   *
   *   docker-compose ---> DOCKER_HOST=unix://~/.lando/run/finch.sock ---> finch-daemon ---> containerd
   *
   * The compose function follows the same `(cmd, datum) => Promise` signature
   * as the Docker path: it calls `compose[cmd](...)` from `lib/compose.js` to get a
   * `{cmd, opts}` shell descriptor, then executes via `shell.sh([orchestratorBin, ...cmd], opts)`.
   *
   * @param {string} id - The Lando instance identifier.
   * @return {Engine} A containerd-backed Engine instance.
   * @private
   */
  _createContainerdEngine(id) {
    const Engine = require('./engine');
    const {ContainerdDaemon, ContainerdContainer} = require('./backends/containerd');
    const dockerCompose = require('./compose');

    const userConfRoot = this.config.userConfRoot || path.join(os.homedir(), '.lando');
    const systemBinDir = this.config.containerdSystemBinDir || '/usr/local/lib/lando/bin';

    // Resolve binary paths — config overrides take precedence, then standard locations
    const containerdBin = this.config.containerdBin || path.join(systemBinDir, 'containerd');
    const nerdctlBin = this.config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
    const buildkitdBin = this.config.buildkitdBin || path.join(systemBinDir, 'buildkitd');
    const socketPath = this.config.containerdSocket || '/run/lando/containerd.sock';
    const buildkitSocket = this.config.buildkitSocket || '/run/lando/buildkitd.sock';
    // Use docker-compose pointed at finch-daemon's Docker-compatible API via DOCKER_HOST.
    // Resolve the compose binary here (config may not have it yet at construction time).
    const composeVersion = this.config.orchestratorVersion || '2.31.0';
    const orchestratorBin = this.config.orchestratorBin
      || path.join(userConfRoot, 'bin', `docker-compose-v${composeVersion}`);

    // Create the daemon backend
    const daemon = new ContainerdDaemon({
      userConfRoot,
      containerdBin,
      buildkitdBin,
      systemBinDir,
      nerdctlBin,
      socketPath,
      events: this.events,
      cache: this.cache,
      log: this.log,
    });

    // Set daemon.compose to the orchestrator binary path so that
    // Engine.composeInstalled (which checks fs.existsSync(config.orchestratorBin))
    // and any code that reads daemon.compose both resolve correctly.
    daemon.compose = orchestratorBin;

    // Get the finch-daemon socket path — used by ContainerdContainer via Dockerode
    const finchSocket = daemon.finchDaemon.getSocketPath();

    // Create the container backend — this becomes engine.docker.
    // Engine stores it as `this.docker` (no Docker-specific handling) and router.js
    // calls the same ContainerBackend interface methods (list, scan, isRunning, remove,
    // stop) on it, so ContainerdContainer is a transparent drop-in for Landerode here.
    //
    // ContainerdContainer uses Dockerode pointed at finch-daemon's Docker-compatible
    // socket instead of shelling out to nerdctl. This avoids nerdctl's rootless-vs-rootful
    // issues ("rootless containerd not running").
    const rawDocker = new ContainerdContainer({
      finchSocket,
      id,
      debug: this.debug,
    });

    // Wrap ContainerdContainer methods to return Bluebird promises.
    // Lando's router.js uses Bluebird methods (.each, .tap, .map) on the
    // return values from docker.list(), docker.isRunning(), etc.
    const Promise = require('./promise');
    const docker = new Proxy(rawDocker, {
      get(target, prop) {
        const value = target[prop];
        if (typeof value === 'function') {
          return (...args) => {
            const result = value.apply(target, args);
            // Wrap Promise-like returns in Bluebird
            if (result && typeof result.then === 'function') {
              return Promise.resolve(result);
            }
            return result;
          };
        }
        return value;
      },
    });

    // Use the same compose.js as the Docker path, but route through
    // finch-daemon's Docker-compatible socket via DOCKER_HOST.
    const ensureCniNetwork = require('../utils/ensure-cni-network');
    const compose = (cmd, datum) => {
      // Ensure CNI network configs exist for compose-created networks.
      // docker-compose via finch-daemon creates Docker API networks but not CNI configs.
      // nerdctl's OCI hook needs CNI configs for container networking.
      if (cmd === 'start') {
        ensureCniNetwork(`${datum.project}_default`, {debug: this.debug});
      }
      const run = dockerCompose[cmd](datum.compose, datum.project, datum.opts || {});
      return this.shell.sh([orchestratorBin].concat(run.cmd), {
        ...(run.opts || {}),
        env: {
          ...process.env,
          ...(run.opts?.env || {}),
          DOCKER_HOST: `unix://${finchSocket}`,
          DOCKER_BUILDKIT: '1',
          BUILDKIT_HOST: `unix://${buildkitSocket}`,
        },
      });
    };

    this.debug('created containerd engine backend');
    return new Engine(daemon, docker, compose, this.config);
  }

  /**
   * Auto-detect the best available engine backend.
   *
   * Detection order:
   * 1. Check if containerd binaries exist at `~/.lando/bin/containerd` (or config override paths).
   * 2. If all three binaries (containerd, nerdctl, buildkitd) exist, use containerd.
   * 3. Otherwise, fall back to Docker.
   *
   * Logs which engine was selected.
   *
   * @param {string} id - The Lando instance identifier.
   * @return {Engine} An Engine instance using the auto-detected backend.
   * @private
   */
  _createAutoEngine(id) {
    const userConfRoot = this.config.userConfRoot || path.join(os.homedir(), '.lando');

    // Resolve binary paths — config overrides take precedence
    const systemBinDir = this.config.containerdSystemBinDir || '/usr/local/lib/lando/bin';
    const containerdBin = this.config.containerdBin || path.join(systemBinDir, 'containerd');
    const nerdctlBin = this.config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
    const buildkitdBin = this.config.buildkitdBin || path.join(systemBinDir, 'buildkitd');

    // Check if all containerd binaries exist
    const hasContainerd = fs.existsSync(containerdBin);
    const hasNerdctl = fs.existsSync(nerdctlBin);
    const hasBuildkitd = fs.existsSync(buildkitdBin);

    if (hasContainerd && hasNerdctl && hasBuildkitd) {
      this.debug('auto-detected containerd engine (all binaries found at %s)', path.join(userConfRoot, 'bin'));
      return this._createContainerdEngine(id);
    }

    // Log what was missing if some but not all binaries were found
    if (hasContainerd || hasNerdctl || hasBuildkitd) {
      const missing = [];
      if (!hasContainerd) missing.push('containerd');
      if (!hasNerdctl) missing.push('nerdctl');
      if (!hasBuildkitd) missing.push('buildkitd');
      this.debug(
        'containerd binaries partially found (missing: %s), falling back to docker',
        missing.join(', '),
      );
    } else {
      this.debug('no containerd binaries found, using docker engine');
    }

    return this._createDockerEngine(id);
  }
}

module.exports = BackendManager;
