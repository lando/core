'use strict';

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Docker = require('dockerode');

const {ContainerBackend} = require('../engine-backend');

const toLandoContainer = require('../../../utils/to-lando-container');
const dockerComposify = require('../../../utils/docker-composify');

/**
 * Helper to determine if any file exists in an array of files.
 *
 * @param {Array<string>} files - Array of file paths to check.
 * @return {boolean}
 * @private
 */
const srcExists = (files = []) => _.reduce(files, (exists, file) => fs.existsSync(file) || exists, false);

/**
 * Containerd implementation of the ContainerBackend interface.
 *
 * Uses Dockerode pointed at the finch-daemon socket to provide all low-level
 * container and network operations. finch-daemon provides Docker API v1.43
 * compatibility backed by containerd, which is the same approach used for
 * compose (docker-compose + finch-daemon).
 *
 * This replaces the previous nerdctl-based implementation which failed when
 * running as non-root with rootful containerd ("rootless containerd not running").
 *
 * @extends ContainerBackend
 * @since 4.0.0
 */
class ContainerdContainer extends ContainerBackend {
  /**
   * Create a ContainerdContainer backend.
   *
   * @param {Object}   [opts={}]            - Configuration options.
   * @param {string}   [opts.finchSocket]   - Path to the finch-daemon Docker-compatible socket.
   * @param {string}   [opts.id='lando']    - Lando instance identifier for filtering containers.
   * @param {Function} [opts.debug]         - Debug/logging function.
   */
  constructor(opts = {}) {
    super();

    const userConfRoot = opts.userConfRoot ?? path.join(os.homedir(), '.lando');
    const runDir = path.join(userConfRoot, 'run');

    /** @type {string} Path to the finch-daemon socket. */
    this.finchSocket = opts.finchSocket ?? path.join(runDir, 'finch.sock');

    /** @type {string} Lando instance identifier. */
    this.id = opts.id ?? 'lando';

    /** @type {Function} Debug/logging function. */
    this.debug = opts.debug ?? require('../../../utils/debug-shim')(new (require('../../logger'))());

    /** @type {Docker} Dockerode instance connected to finch-daemon. */
    this.dockerode = new Docker({socketPath: this.finchSocket});
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Check whether an error represents a "not found" condition.
   *
   * Covers the various phrasings from Docker API and nerdctl: "no such container",
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

  // =========================================================================
  // ContainerBackend interface
  // =========================================================================

  /**
   * Create a container network.
   *
   * Creates a network with the Lando container label. Unlike the Docker
   * backend, we do NOT use `Internal: true` because containerd bridge
   * networks need outbound access and inter-container communication
   * works on bridge networks.
   *
   * @param {string} name - The name of the network to create.
   * @param {Object} [opts={}] - Additional network creation options.
   * @return {Promise<Object>} Network inspect data.
   */
  async createNet(name, opts = {}) {
    const labels = {'io.lando.container': 'TRUE'};

    // Merge any extra labels from opts
    if (opts.Labels) {
      Object.assign(labels, opts.Labels);
    }

    await this.dockerode.createNetwork({
      Name: name,
      Labels: labels,
      Attachable: true,
    });

    // Return network inspect data (matching Docker behavior)
    const network = this.dockerode.getNetwork(name);
    return network.inspect();
  }

  /**
   * Inspect a container and return its full metadata.
   *
   * Equivalent to `docker inspect <cid>`. The Docker API (via finch-daemon)
   * returns Docker-compatible JSON.
   *
   * @param {string} cid - A container identifier (hash, name, or short id).
   * @return {Promise<Object>} Container inspect data.
   * @throws {Error} If the container does not exist.
   */
  async scan(cid) {
    return this.dockerode.getContainer(cid).inspect();
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
      const data = await this.dockerode.getContainer(cid).inspect();
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
   * 1. List all containers via Dockerode's `listContainers({all: true})`.
   * 2. Filter out containers with invalid status (e.g. "Removal In Progress").
   * 3. Map through `to-lando-container`.
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
    // Get raw container list from Dockerode (Docker API format)
    let rawContainers;
    try {
      rawContainers = await this.dockerode.listContainers({all: true});
    } catch (err) {
      // If the API fails (e.g. finch-daemon not running), return empty list
      this.debug('listContainers failed: %s', err.message);
      return [];
    }

    if (!rawContainers || rawContainers.length === 0) return [];

    // Filter out nulls/undefined and invalid statuses
    let containers = rawContainers
      .filter(_.identity)
      .filter(data => (data.Status || '') !== 'Removal In Progress');

    // Map to Lando containers — Dockerode returns Docker API format which
    // toLandoContainer already handles (Labels as object, Id, Status)
    containers = containers
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
    try {
      await this.dockerode.getContainer(cid).remove({
        v: opts.v !== false,
        force: !!opts.force,
      });
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
    try {
      await this.dockerode.getContainer(cid).stop(opts);
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
   * Returns a lightweight proxy object with `inspect()`, `remove()`,
   * `connect()`, and `disconnect()` methods that delegate to Dockerode,
   * matching the Dockerode Network handle interface.
   *
   * @param {string} id - The network id or name.
   * @return {Object} A network handle with `inspect()`, `remove()`, `connect()`, and `disconnect()` methods.
   */
  getNetwork(id) {
    const network = this.dockerode.getNetwork(id);
    return {
      /** @type {string} The network id or name. */
      id,

      /**
       * Inspect the network and return its metadata.
       * @return {Promise<Object>} Network inspect data.
       */
      inspect: () => network.inspect(),

      /**
       * Remove the network.
       * @return {Promise<void>}
       */
      remove: async () => {
        try {
          await network.remove();
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
      connect: (connectOpts = {}) => {
        if (!connectOpts.Container) throw new Error('Container is required for network connect');
        return network.connect(connectOpts);
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
        if (!disconnectOpts.Container) throw new Error('Container is required for network disconnect');
        try {
          await network.disconnect(disconnectOpts);
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
    try {
      return await this.dockerode.listNetworks(opts);
    } catch (err) {
      this.debug('listNetworks failed: %s', err.message);
      return [];
    }
  }

  /**
   * Get a container handle by its id or name.
   *
   * Returns a lightweight proxy object with `inspect()`, `remove()`, and
   * `stop()` methods that delegate to Dockerode, matching the Dockerode
   * Container handle interface.
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
      inspect: () => this.dockerode.getContainer(cid).inspect(),

      /**
       * Remove the container.
       * @param {Object} [opts] - Removal options.
       * @return {Promise<void>}
       */
      remove: opts => this.dockerode.getContainer(cid).remove(opts),

      /**
       * Stop the container.
       * @param {Object} [opts] - Stop options.
       * @return {Promise<void>}
       */
      stop: opts => this.dockerode.getContainer(cid).stop(opts),
    };
  }
}

module.exports = ContainerdContainer;
