'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {ContainerBackend} = require('../engine-backend');
const Promise = require('../../promise');

const toLandoContainer = require('../../../utils/to-lando-container');
const dockerComposify = require('../../../utils/docker-composify');
const runCommand = require('../../../utils/run-command');
const {getContainerdAuthConfig} = require('../../../utils/setup-containerd-auth');

/**
 * Helper to determine if any file exists in an array of files.
 *
 * @param {Array<string>} files - Array of file paths to check.
 * @return {boolean}
 * @private
 */
const srcExists = (files = []) => _.reduce(files, (exists, file) => fs.existsSync(file) || exists, false);

/**
 * Parse a nerdctl labels string into a Docker-compatible Labels object.
 *
 * nerdctl `ps --format json` returns labels as a comma-separated string
 * like `"key1=val1,key2=val2"`, while the Docker API returns them as
 * a plain object `{key1: "val1", key2: "val2"}`.
 *
 * Handles edge cases:
 * - Empty/missing labels → empty object
 * - Labels whose values contain `=` (only split on first `=`)
 * - Labels whose values contain `,` within values that also contain `=`
 *
 * @param {string|Object} labels - Labels string from nerdctl or object from inspect.
 * @return {Object} Docker-compatible labels object.
 * @private
 */
const parseLabels = labels => {
  if (!labels) return {};
  if (typeof labels === 'object') return labels;
  if (typeof labels !== 'string') return {};

  // nerdctl separates labels with commas, but label *values* can also contain
  // commas (e.g. "io.lando.landofiles=.lando.yml,.lando.local.yml").
  //
  // Strategy: split on commas, then rejoin any segment that does NOT contain
  // an "=" back onto the previous entry — it is a continuation of the
  // previous label's value, not a new key=value pair.
  const segments = labels.split(',');
  const pairs = [];
  for (const segment of segments) {
    if (!segment.includes('=') && pairs.length > 0) {
      // Continuation value — append back with the comma that was stripped
      pairs[pairs.length - 1] += ',' + segment;
    } else {
      // New key=value pair (or first segment without =, which should be rare but treated as new pair)
      pairs.push(segment);
    }
  }

  const result = {};
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1);
    if (key) result[key] = value;
  }
  return result;
};

/**
 * Normalize a nerdctl `ps --format json` line into the shape expected
 * by `utils/to-lando-container.js`: `{Labels, Id, Status}`.
 *
 * nerdctl JSONL fields (capitalized):
 * - `ID`       → container id (full hash)
 * - `Names`    → container name
 * - `Labels`   → comma-separated key=value string
 * - `Status`   → status text (e.g. "Up 2 hours")
 * - `Image`    → image name
 * - `Ports`    → port mappings
 * - `CreatedAt`→ creation timestamp
 *
 * Docker API `listContainers` fields:
 * - `Id`       → container id
 * - `Names`    → array of names (with leading `/`)
 * - `Labels`   → object `{key: value}`
 * - `Status`   → status text
 *
 * @param {Object} nerdctlContainer - A parsed JSON line from `nerdctl ps --format json`.
 * @return {Object} Docker API-compatible container object.
 * @private
 */
const normalizeContainer = nerdctlContainer => {
  return {
    Id: nerdctlContainer.ID || nerdctlContainer.Id || '',
    Names: Array.isArray(nerdctlContainer.Names)
      ? nerdctlContainer.Names
      : [nerdctlContainer.Names || ''],
    Labels: typeof nerdctlContainer.Labels === 'string'
      ? parseLabels(nerdctlContainer.Labels)
      : (nerdctlContainer.Labels || {}),
    Status: nerdctlContainer.Status || '',
    Image: nerdctlContainer.Image || '',
    Ports: nerdctlContainer.Ports || '',
    CreatedAt: nerdctlContainer.CreatedAt || '',
  };
};

/**
 * Containerd implementation of the ContainerBackend interface.
 *
 * Wraps the `nerdctl` CLI to provide all low-level container and network
 * operations. Uses the `--address` flag to target Lando's own isolated
 * containerd socket rather than the system default.
 *
 * nerdctl output formats are Docker-compatible for `inspect` and `ps`,
 * making it straightforward to reuse the same Lando container utilities.
 *
 * @extends ContainerBackend
 * @since 4.0.0
 */
class ContainerdContainer extends ContainerBackend {
  /**
   * Create a ContainerdContainer backend.
   *
   * @param {Object}   [opts={}]            - Configuration options.
   * @param {string}   [opts.nerdctlBin]    - Path to the nerdctl binary.
   * @param {string}   [opts.socketPath]    - Path to the containerd gRPC socket (--address flag).
   * @param {string}   [opts.id='lando']    - Lando instance identifier for filtering containers.
   * @param {Function} [opts.debug]         - Debug/logging function.
   * @param {Object}   [opts.authConfig]    - Registry auth configuration from `getContainerdAuthConfig()`.
   *   When provided, its `env` object is merged into nerdctl command opts to ensure
   *   nerdctl finds the Docker config for private registry authentication.
   */
  constructor(opts = {}) {
    super();

    const userConfRoot = opts.userConfRoot ?? path.join(os.homedir(), '.lando');
    const binDir = path.join(userConfRoot, 'bin');
    const runDir = path.join(userConfRoot, 'run');

    /** @type {string} Path to the nerdctl binary. */
    this.nerdctlBin = opts.nerdctlBin ?? path.join(binDir, 'nerdctl');

    /** @type {string} containerd gRPC socket path. */
    this.socketPath = opts.socketPath ?? path.join(runDir, 'containerd.sock');

    /** @type {boolean} Whether running in rootless mode (nerdctl auto-detects socket). */
    this.useRootless = opts.useRootless ?? false;

    /** @type {string} Lando instance identifier. */
    this.id = opts.id ?? 'lando';

    /** @type {Function} Debug/logging function. */
    this.debug = opts.debug ?? require('../../../utils/debug-shim')(new (require('../../logger'))());

    /**
     * Registry auth configuration.
     * @type {{dockerConfig: string, env: Object, configExists: boolean, credentialHelpers: string[]}}
     */
    this.authConfig = opts.authConfig || getContainerdAuthConfig();
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Check whether an error represents a "not found" condition from nerdctl.
   *
   * Covers the various phrasings nerdctl may use: "no such container",
   * "No such container", "no such object", "not found".
   *
   * @param {Error} err - The error to inspect.
   * @return {boolean} `true` if the error indicates a missing resource.
   * @private
   */
  _isNotFoundError(err) {
    const msg = err && err.message ? err.message.toLowerCase() : '';
    return msg.includes('no such container')
      || msg.includes('no such object')
      || msg.includes('no such network')
      || msg.includes('not found');
  }

  /**
   * Execute a nerdctl command and return its stdout as a string.
   *
   * Automatically prepends `--address <socketPath>` to all commands so
   * they target Lando's isolated containerd instance.
   *
   * @param {Array<string>} args - nerdctl subcommand and arguments.
   * @param {Object} [opts={}] - Additional options passed to `run-command`.
   * @param {boolean} [opts.ignoreReturnCode=false] - Whether to suppress non-zero exit errors.
   * @return {Promise<string>} The trimmed stdout from the command.
   * @throws {Error} If the command exits non-zero and `ignoreReturnCode` is false.
   * @private
   */
  async _nerdctl(args, opts = {}) {
    const fullArgs = (this.useRootless || !this.socketPath) ? [...args] : ['--address', this.socketPath, ...args];
    this.debug('nerdctl %o', fullArgs);

    // Ensure /usr/sbin and /sbin are in PATH for CNI plugins (iptables, etc.)
    const baseEnv = opts.env || process.env;
    const currentPath = baseEnv.PATH || '';
    const needsSbin = !currentPath.includes('/usr/sbin');
    const sbinPath = needsSbin ? `/usr/sbin:/sbin:${currentPath}` : currentPath;

    // Merge auth env vars (e.g. DOCKER_CONFIG) and sbin PATH
    const authEnv = this.authConfig && this.authConfig.env ? this.authConfig.env : {};
    const envOverrides = {...authEnv};
    if (needsSbin) envOverrides.PATH = sbinPath;
    const hasEnvOverrides = Object.keys(envOverrides).length > 0;
    const mergedOpts = hasEnvOverrides
      ? Object.assign({}, opts, {env: Object.assign({}, baseEnv, envOverrides)})
      : opts;

    const {stdout} = await runCommand(this.nerdctlBin, fullArgs, {
      debug: this.debug,
      ...mergedOpts,
    });

    return stdout.toString().trim();
  }

  // =========================================================================
  // ContainerBackend interface
  // =========================================================================

  /**
   * Create a container network.
   *
   * Creates a network with the Lando container label. Unlike the Docker
   * backend, we do NOT use `--internal` because nerdctl does not support
   * that flag. This is acceptable for Lando since containers need outbound
   * network access and inter-container communication works on bridge networks.
   *
   * Note: nerdctl does not support `--attachable` (it's a Docker Swarm concept),
   * but this is fine for single-host containerd usage where all containers can
   * attach to any network by default.
   *
   * @param {string} name - The name of the network to create.
   * @param {Object} [opts={}] - Additional network creation options.
   * @return {Promise<Object>} Network inspect data.
   */
  async createNet(name, opts = {}) {
    const args = ['network', 'create'];

    // Add Lando label
    args.push('--label', 'io.lando.container=TRUE');

    // NOTE: nerdctl does not support --internal flag. Lando networks are
    // created as standard bridge networks, which is fine since containers
    // need to communicate with each other and the outside world.

    // Add any extra labels from opts
    if (opts.Labels) {
      for (const [key, value] of Object.entries(opts.Labels)) {
        args.push('--label', `${key}=${value}`);
      }
    }

    // Network name goes last
    args.push(name);

    await this._nerdctl(args);

    // Return network inspect data (matching Docker behavior which returns the network)
    const inspectData = await this._nerdctl(['network', 'inspect', name]);
    const parsed = JSON.parse(inspectData);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  }

  /**
   * Inspect a container and return its full metadata.
   *
   * Equivalent to `docker inspect <cid>`. nerdctl inspect output is
   * Docker-compatible JSON.
   *
   * @param {string} cid - A container identifier (hash, name, or short id).
   * @return {Promise<Object>} Container inspect data.
   * @throws {Error} If the container does not exist.
   */
  async scan(cid) {
    const data = await this._nerdctl(['inspect', cid, '--format', 'json']);
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  }

  /**
   * Determine whether a container is currently running.
   *
   * Returns `false` (not throw) if the container does not exist,
   * to prevent race conditions when containers are removed between checks.
   *
   * @param {string} cid - A container identifier.
   * @return {Promise<boolean>}
   */
  async isRunning(cid) {
    try {
      const data = await this.scan(cid);
      return _.get(data, 'State.Running', false);
    } catch (err) {
      // Handle "no such container" gracefully — matches Docker behavior
      if (this._isNotFoundError(err)) return false;
      throw err;
    }
  }

  /**
   * List Lando-managed containers.
   *
   * Replicates the full filtering pipeline from {@link Landerode#list}:
   * 1. List all containers via `nerdctl ps -a --format json` (JSONL output).
   * 2. Filter out containers with invalid status (e.g. "Removal In Progress").
   * 3. Normalize to Docker API format and map through `to-lando-container`.
   * 4. Filter to Lando containers (`lando === true`, `instance === this.id`).
   * 5. Remove orphaned app containers whose compose source files no longer exist.
   * 6. Filter by project/app name if specified.
   * 7. Filter by additional `key=value` filter pairs.
   * 8. Retry if any container has been up for less than a second.
   * 9. Add `running` status flag.
   *
   * @param {Object} [options={}] - Listing options.
   * @param {boolean} [options.all=false] - Include stopped containers.
   * @param {string}  [options.app] - Filter to a specific app name.
   * @param {string}  [options.project] - Filter to a specific project name.
   * @param {Array<string>} [options.filter] - Additional `key=value` filters.
   * @param {string}  [separator='_'] - Container name separator.
   * @param {number}  [_retryCount=0] - Internal retry counter to prevent unbounded recursion.
   * @return {Promise<Array<Object>>} Array of Lando container descriptors.
   */
  async list(options = {}, separator = '_', _retryCount = 0) {
    // Get raw container list from nerdctl (JSONL: one JSON object per line)
    let rawOutput;
    try {
      rawOutput = await this._nerdctl(['ps', '-a', '--format', 'json']);
    } catch (err) {
      // If nerdctl fails (e.g. containerd not running), return empty list
      this.debug('nerdctl ps failed: %s', err.message);
      return [];
    }

    if (!rawOutput) return [];

    // Parse JSONL — each line is a separate JSON object
    const rawContainers = rawOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Filter out nulls/undefined and invalid statuses
    let containers = rawContainers
      .filter(_.identity)
      .filter(data => (data.Status || '') !== 'Removal In Progress');

    // Normalize to Docker API format and map to Lando containers
    containers = containers
      .map(c => normalizeContainer(c))
      .map(container => toLandoContainer(container, separator));

    // Filter to only Lando containers
    containers = containers.filter(data => data.lando === true);

    // Filter to this instance
    containers = containers.filter(data => data.instance === this.id);

    // Remove orphaned app containers whose compose source files no longer exist
    const cleaned = [];
    for (const container of containers) {
      if (!srcExists(container.src) && container.kind === 'app') {
        try {
          await this.remove(container.id, {force: true});
        } catch {
          // Ignore removal errors for orphaned containers
        }
        continue;
      }
      cleaned.push(container);
    }
    containers = cleaned;

    // Filter by app/project name
    if (options.project) {
      containers = _.filter(containers, c => c.app === options.project);
    } else if (options.app) {
      containers = _.filter(containers, c => c.app === dockerComposify(options.app));
    }

    // Apply additional key=value filters
    if (!_.isEmpty(options.filter)) {
      containers = _.filter(
        containers,
        _.fromPairs(_.map(options.filter, filter => filter.split('='))),
      );
    }

    // If any container has been up for only a brief moment, retry
    // (matches Landerode behavior to avoid transient states)
    if (_.find(containers, container => container.status === 'Up Less than a second')) {
      if (_retryCount < 10) {
        return this.list(options, separator, _retryCount + 1);
      }
      this.debug('list retry limit reached, proceeding with transient container states');
    }

    // Add running status flag
    containers = containers.map(container => {
      container.running = container
        && typeof container.status === 'string'
        && !container.status.includes('Exited');
      return container;
    });

    return containers;
  }

  /**
   * Remove (delete) a container.
   *
   * @param {string} cid - A container identifier.
   * @param {Object} [opts={v: true, force: false}] - Removal options.
   * @param {boolean} [opts.v=true] - Also remove associated anonymous volumes.
   * @param {boolean} [opts.force=false] - Force-remove a running container.
   * @return {Promise<void>}
   */
  async remove(cid, opts = {v: true, force: false}) {
    const args = ['rm'];

    if (opts.v !== false) args.push('--volumes');
    if (opts.force) args.push('--force');

    args.push(cid);

    try {
      await this._nerdctl(args);
    } catch (err) {
      // Gracefully handle "no such container" — it's already gone
      if (this._isNotFoundError(err)) {
        this.debug('container %s already removed, ignoring', cid);
        return;
      }
      throw err;
    }
  }

  /**
   * Stop a running container.
   *
   * @param {string} cid - A container identifier.
   * @param {Object} [opts={}] - Stop options (e.g. `{t: 10}` for timeout in seconds).
   * @return {Promise<void>}
   */
  async stop(cid, opts = {}) {
    const args = ['stop'];

    // Support timeout option (same as Docker: opts.t)
    if (opts.t !== undefined) args.push('--time', String(opts.t));

    args.push(cid);

    try {
      await this._nerdctl(args);
    } catch (err) {
      // Gracefully handle "no such container" — it's already gone
      if (this._isNotFoundError(err)) {
        this.debug('container %s already stopped/removed, ignoring', cid);
        return;
      }
      throw err;
    }
  }

  /**
   * Get a network handle by its id or name.
   *
   * Returns a lightweight proxy object with `inspect()` and `remove()`
   * methods that shell out to nerdctl, matching the Dockerode Network
   * handle interface.
   *
   * @param {string} id - The network id or name.
   * @return {Object} A network handle with `inspect()` and `remove()` methods.
   */
  getNetwork(id) {
    return {
      /** @type {string} The network id or name. */
      id,

      /**
       * Inspect the network and return its metadata.
       * @return {Promise<Object>} Network inspect data.
       */
      inspect: async () => {
        const data = await this._nerdctl(['network', 'inspect', id]);
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed[0] : parsed;
      },

      /**
       * Remove the network.
       * @return {Promise<void>}
       */
      remove: async () => {
        try {
          await this._nerdctl(['network', 'rm', id]);
        } catch (err) {
          if (this._isNotFoundError(err)) {
            this.debug('network %s already removed, ignoring', id);
            return;
          }
          throw err;
        }
      },

      /**
       * Connect a container to this network.
       *
       * Matches the Dockerode `Network.connect()` interface used by
       * `hooks/app-add-2-landonet.js`.
       *
       * @param {Object} [connectOpts={}] - Connection options.
       * @param {string} connectOpts.Container - The container id or name to connect.
       * @param {Object} [connectOpts.EndpointConfig] - Endpoint configuration.
       * @param {Array<string>} [connectOpts.EndpointConfig.Aliases] - DNS aliases for the container.
       * @return {Promise<void>}
       */
      connect: async (connectOpts = {}) => {
        const containerId = connectOpts.Container;
        if (!containerId) throw new Error('Container is required for network connect');
        const args = ['network', 'connect'];
        // Add endpoint config aliases if present
        if (connectOpts.EndpointConfig && connectOpts.EndpointConfig.Aliases) {
          for (const alias of connectOpts.EndpointConfig.Aliases) {
            args.push('--alias', alias);
          }
        }
        args.push(id, containerId);
        await this._nerdctl(args);
      },

      /**
       * Disconnect a container from this network.
       *
       * Matches the Dockerode `Network.disconnect()` interface used by
       * `hooks/app-add-2-landonet.js`. Silently ignores "not connected"
       * errors to match Docker behavior.
       *
       * @param {Object} [disconnectOpts={}] - Disconnection options.
       * @param {string} disconnectOpts.Container - The container id or name to disconnect.
       * @param {boolean} [disconnectOpts.Force=false] - Force disconnection.
       * @return {Promise<void>}
       */
      disconnect: async (disconnectOpts = {}) => {
        const containerId = disconnectOpts.Container;
        if (!containerId) throw new Error('Container is required for network disconnect');
        const args = ['network', 'disconnect'];
        if (disconnectOpts.Force) args.push('--force');
        args.push(id, containerId);
        try {
          await this._nerdctl(args);
        } catch (err) {
          // Match Docker behavior: ignore "not connected" errors
          if (err.message && err.message.includes('is not connected')) {
            return;
          }
          throw err;
        }
      },
    };
  }

  /**
   * List networks matching the given filter options.
   *
   * @param {Object} [opts={}] - Filter options.
   * @param {Object} [opts.filters] - Filters object (e.g. `{name: ['mynet']}` or `{id: ['abc']}`).
   * @return {Promise<Array<Object>>} Array of network objects.
   */
  async listNetworks(opts = {}) {
    let rawOutput;
    try {
      rawOutput = await this._nerdctl(['network', 'ls', '--format', 'json']);
    } catch (err) {
      this.debug('nerdctl network ls failed: %s', err.message);
      return [];
    }

    if (!rawOutput) return [];

    // Parse JSONL output
    let networks = rawOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Apply filters if present (matching Docker API filter behavior)
    if (opts.filters) {
      const filters = opts.filters;

      if (filters.name && filters.name.length > 0) {
        networks = networks.filter(n => {
          const name = n.Name || n.name || '';
          return filters.name.some(f => name.includes(f));
        });
      }

      if (filters.id && filters.id.length > 0) {
        networks = networks.filter(n => {
          const id = n.ID || n.Id || n.id || '';
          return filters.id.some(f => id.startsWith(f));
        });
      }

      if (filters.label && filters.label.length > 0) {
        networks = networks.filter(n => {
          const labels = typeof n.Labels === 'string' ? parseLabels(n.Labels) : (n.Labels || {});
          return filters.label.every(f => {
            const [key, value] = f.split('=');
            if (value !== undefined) return labels[key] === value;
            return key in labels;
          });
        });
      }
    }

    return networks;
  }

  /**
   * Get a container handle by its id or name.
   *
   * Returns a lightweight proxy object with `inspect()`, `remove()`, and
   * `stop()` methods that delegate to this backend's methods, matching the
   * Dockerode Container handle interface.
   *
   * @param {string} cid - The container id or name.
   * @return {Object} A container handle with `inspect()`, `remove()`, and `stop()` methods.
   */
  getContainer(cid) {
    return {
      /** @type {string} The container id or name. */
      id: cid,

      /**
       * Inspect the container and return its metadata.
       * @return {Promise<Object>} Container inspect data.
       */
      inspect: () => this.scan(cid),

      /**
       * Remove the container.
       * @param {Object} [opts] - Removal options.
       * @return {Promise<void>}
       */
      remove: opts => this.remove(cid, opts),

      /**
       * Stop the container.
       * @param {Object} [opts] - Stop options.
       * @return {Promise<void>}
       */
      stop: opts => this.stop(cid, opts),
    };
  }
}

module.exports = ContainerdContainer;
