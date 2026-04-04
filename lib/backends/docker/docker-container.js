'use strict';

const {ContainerBackend} = require('../engine-backend');
const Landerode = require('../../docker');

/**
 * Docker implementation of the ContainerBackend interface.
 *
 * Wraps the existing {@link Landerode} class (which extends Dockerode),
 * delegating all low-level container and network operations to it. This
 * preserves the full container management logic while conforming to the
 * pluggable backend interface introduced in Lando 4.
 *
 * @extends ContainerBackend
 * @since 4.0.0
 */
class DockerContainer extends ContainerBackend {
  /**
   * Create a DockerContainer backend.
   *
   * @param {Object} [opts={}] - Dockerode connection options (e.g. `{socketPath}`, `{host, port}`).
   * @param {string} [id='lando'] - The Lando instance identifier used for filtering containers.
   */
  constructor(opts = {}, id = 'lando') {
    super();

    /**
     * The underlying Landerode (Dockerode) instance.
     * @type {Landerode}
     * @private
     */
    this._docker = new Landerode(opts, id);

    /** @type {string} */
    this.id = id;
  }

  /**
   * Create a Docker network.
   *
   * The network is created as **attachable** and **internal** by default,
   * matching the existing Landerode behavior.
   *
   * @param {string} name - The name of the network to create.
   * @param {Object} [opts={}] - Additional network creation options.
   * @returns {Promise<Object>} Network inspect data.
   */
  async createNet(name, opts = {}) {
    return this._docker.createNet(name, opts);
  }

  /**
   * Inspect a container and return its full metadata.
   *
   * Equivalent to `docker inspect <cid>`.
   *
   * @param {string} cid - A container identifier (hash, name, or short id).
   * @returns {Promise<Object>} Container inspect data.
   */
  async scan(cid) {
    return this._docker.scan(cid);
  }

  /**
   * Determine whether a container is currently running.
   *
   * Returns `false` (not throw) if the container does not exist.
   *
   * @param {string} cid - A container identifier.
   * @returns {Promise<boolean>}
   */
  async isRunning(cid) {
    return this._docker.isRunning(cid);
  }

  /**
   * List Lando-managed containers.
   *
   * Delegates to {@link Landerode#list} which handles filtering by
   * Lando labels, orphan removal, project/app filtering, and status enrichment.
   *
   * @param {Object} [options={}] - Listing options.
   * @param {boolean} [options.all=false] - Include stopped containers.
   * @param {string} [options.app] - Filter to a specific app name.
   * @param {string} [options.project] - Filter to a specific project name.
   * @param {Array<string>} [options.filter] - Additional `key=value` filters.
   * @param {string} [separator='_'] - Container name separator.
   * @returns {Promise<Array<Object>>} Array of Lando container descriptors.
   */
  async list(options, separator) {
    return this._docker.list(options, separator);
  }

  /**
   * Remove (delete) a container.
   *
   * @param {string} cid - A container identifier.
   * @param {Object} [opts={v: true, force: false}] - Removal options.
   * @returns {Promise<void>}
   */
  async remove(cid, opts) {
    return this._docker.remove(cid, opts);
  }

  /**
   * Stop a running container.
   *
   * @param {string} cid - A container identifier.
   * @param {Object} [opts={}] - Stop options (e.g. `{t: 10}` for timeout).
   * @returns {Promise<void>}
   */
  async stop(cid, opts) {
    return this._docker.stop(cid, opts);
  }

  /**
   * Get a network handle by its id or name.
   *
   * Returns a lightweight Dockerode proxy object that lazily calls the
   * Docker API when methods are invoked.
   *
   * @param {string} id - The network id or name.
   * @returns {Object} A Dockerode Network handle.
   */
  getNetwork(id) {
    return this._docker.getNetwork(id);
  }

  /**
   * List networks matching the given filter options.
   *
   * @param {Object} [opts={}] - Filter options (see Docker API `NetworkList`).
   * @returns {Promise<Array<Object>>} Array of network objects.
   */
  async listNetworks(opts) {
    return this._docker.listNetworks(opts);
  }

  /**
   * Get a container handle by its id or name.
   *
   * Returns a lightweight Dockerode proxy object that lazily calls the
   * Docker API when methods are invoked.
   *
   * @param {string} cid - The container id or name.
   * @returns {Object} A Dockerode Container handle.
   */
  getContainer(cid) {
    return this._docker.getContainer(cid);
  }
}

module.exports = DockerContainer;
