'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const {allocatePorts} = require('../utils/allocate-ports');

/**
 * BackendManager — Factory that creates the right Engine based on config.
 *
 * This is designed as a **drop-in replacement** for `utils/setup-engine.js`.
 * Instead of always creating a Docker-backed Engine, it inspects `config.engine`
 * to choose the appropriate backend:
 *
 * - `"docker"` — Uses DockerDaemon, DockerContainer, DockerCompose (identical to setup-engine.js)
 * - `"containerd"` — Uses ContainerdDaemon, ContainerdContainer, NerdctlCompose
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
/**
 * Rewrite port mappings in compose files to use explicit host ports.
 *
 * Rootless nerdctl does not support automatic port allocation — port specs like
 * "127.0.0.1::80" or just "80" fail with "automatic port allocation is not
 * implemented for rootless mode". This function reads each compose YAML file,
 * rewrites any port mapping that lacks an explicit host port, and writes the
 * modified YAML back to disk.
 *
 * @param {string[]} composeFiles - Array of compose file paths.
 * @returns {Promise<void>}
 */
const rewriteComposePortsForRootless = async composeFiles => {
  for (const filePath of composeFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(content);
    if (!doc || !doc.services) continue;

    let modified = false;
    for (const [, service] of Object.entries(doc.services)) {
      if (service.ports && Array.isArray(service.ports) && service.ports.length > 0) {
        const rewritten = await allocatePorts(service.ports);
        // Check if anything actually changed
        if (JSON.stringify(rewritten) !== JSON.stringify(service.ports)) {
          service.ports = rewritten;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, yaml.dump(doc, {lineWidth: -1, noRefs: true}));
    }
  }
};

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
   * Uses ContainerdDaemon, ContainerdContainer, and NerdctlCompose from
   * `lib/backends/containerd/` to wire up an Engine that talks to Lando's
   * own isolated containerd + buildkitd + nerdctl stack.
   *
   * The compose function follows the same `(cmd, datum) => Promise` signature
   * as the Docker path: it calls `NerdctlCompose[cmd](...)` to get a
   * `{cmd, opts}` shell descriptor, then executes via `shell.sh([nerdctlBin, ...cmd], opts)`.
   *
   * @param {string} id - The Lando instance identifier.
   * @return {Engine} A containerd-backed Engine instance.
   * @private
   */
  _createContainerdEngine(id) {
    const Engine = require('./engine');
    const {ContainerdDaemon, ContainerdContainer, NerdctlCompose} = require('./backends/containerd');

    const userConfRoot = this.config.userConfRoot || path.join(os.homedir(), '.lando');

    // Resolve binary paths — config overrides take precedence, then standard locations
    const containerdBin = this.config.containerdBin || path.join(userConfRoot, 'bin', 'containerd');
    const nerdctlBin = this.config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
    const buildkitdBin = this.config.buildkitdBin || path.join(userConfRoot, 'bin', 'buildkitd');
    const socketPath = this.config.containerdSocket || path.join(userConfRoot, 'run', 'containerd.sock');

    // Detect rootless containerd (systemd user service via rootlesskit)
    const xdgRuntime = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid ? process.getuid() : 1000}`;
    const useRootless = fs.existsSync(path.join(xdgRuntime, 'containerd-rootless'));

    // Create the daemon backend
    const daemon = new ContainerdDaemon({
      userConfRoot,
      containerdBin,
      buildkitdBin,
      nerdctlBin,
      socketPath,
      events: this.events,
      cache: this.cache,
      log: this.log,
    });
    if (useRootless) daemon.useRootless = true;

    // Set daemon.compose to the nerdctl binary path so that
    // Engine.composeInstalled (which checks fs.existsSync(config.orchestratorBin))
    // and any code that reads daemon.compose both resolve correctly.
    // ContainerdDaemon sets this.compose = false by default because nerdctl uses
    // `nerdctl compose ...` subcommand syntax rather than a standalone binary,
    // but for the Engine's install-check logic we need it to be a valid path.
    daemon.compose = nerdctlBin;

    // Create the container backend — this becomes engine.docker.
    // Engine stores it as `this.docker` (no Docker-specific handling) and router.js
    // calls the same ContainerBackend interface methods (list, scan, isRunning, remove,
    // stop) on it, so ContainerdContainer is a transparent drop-in for Landerode here.
    const rawDocker = new ContainerdContainer({
      nerdctlBin,
      socketPath: useRootless ? null : socketPath,
      useRootless,
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

    // Create the compose backend
    const {getContainerdAuthConfig} = require('../utils/setup-containerd-auth');
    const authConfig = getContainerdAuthConfig({configPath: this.config.registryAuth});
    const nerdctlCompose = new NerdctlCompose({
      socketPath: useRootless ? null : socketPath,
      useRootless,
      authConfig,
    });

    // Create the compose function with the same (cmd, datum) => Promise signature
    // as the Docker path. Gets {cmd, opts} from NerdctlCompose, then executes
    // via shell.sh([nerdctlBin, ...cmd], opts).
    //
    // Ensures /usr/sbin and /sbin are in PATH for CNI plugins (iptables, bridge, etc.)
    // which nerdctl compose needs for network setup.
    const compose = async (cmd, datum) => {
      // For rootless mode, rewrite port mappings in compose files before
      // passing to nerdctl — rootless nerdctl does not support automatic
      // port allocation (e.g. "127.0.0.1::80" or just "80").
      if (useRootless && ['start', 'run', 'build'].includes(cmd)) {
        await rewriteComposePortsForRootless(datum.compose);
      }
      const run = nerdctlCompose[cmd](datum.compose, datum.project, datum.opts || {});
      const runOpts = run.opts || {};
      const baseEnv = runOpts.env || process.env;
      const currentPath = baseEnv.PATH || '';
      if (!currentPath.includes('/usr/sbin')) {
        runOpts.env = {...baseEnv, PATH: `/usr/sbin:/sbin:${currentPath}`};
      }
      return this.shell.sh([nerdctlBin].concat(run.cmd), runOpts);
    };

    // Ensure Engine.composeInstalled works — it checks config.orchestratorBin
    const engineConfig = {...this.config, orchestratorBin: nerdctlBin};

    // TODO: v4 image builds still use `docker buildx build` from the host Docker
    // installation (see Lando v4 service build pipeline). This means v4 services
    // will fall back to the system Docker for image builds even when the containerd
    // engine is selected. Fixing this requires changes to the v4 build pipeline to
    // use `nerdctl build` (backed by buildkitd) instead of `docker buildx build`.
    // Tracked as a separate issue — out of scope for the initial containerd backend.

    this.debug('created containerd engine backend');
    return new Engine(daemon, docker, compose, engineConfig);
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
    const containerdBin = this.config.containerdBin || path.join(userConfRoot, 'bin', 'containerd');
    const nerdctlBin = this.config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
    const buildkitdBin = this.config.buildkitdBin || path.join(userConfRoot, 'bin', 'buildkitd');

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
