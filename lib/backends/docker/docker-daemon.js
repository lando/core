'use strict';

const {DaemonBackend} = require('../engine-backend');
const LandoDaemon = require('../../daemon');

/**
 * Docker implementation of the DaemonBackend interface.
 *
 * Wraps the existing {@link LandoDaemon} class, delegating all lifecycle
 * operations (start, stop, health-check, version retrieval) to it. This
 * preserves the full platform-specific logic for macOS Docker Desktop,
 * Linux docker engine, and WSL while conforming to the pluggable backend
 * interface introduced in Lando 4.
 *
 * @extends DaemonBackend
 * @since 4.0.0
 */
class DockerDaemon extends DaemonBackend {
  /**
   * Create a DockerDaemon backend.
   *
   * Accepts the same parameters as {@link LandoDaemon} and creates an
   * internal instance that handles all the real work.
   *
   * @param {Object}  [cache]               - A Lando Cache instance.
   * @param {Object}  [events]              - A Lando Events instance.
   * @param {string}  [docker]              - Path to the docker binary.
   * @param {Object}  [log]                 - A Lando Log instance.
   * @param {string}  [context='node']      - Execution context (`'node'` or `'browser'`).
   * @param {string}  [compose]             - Path to the docker-compose binary.
   * @param {string}  [orchestratorVersion] - The orchestrator version string.
   * @param {string}  [userConfRoot]        - Path to the user config root directory.
   */
  constructor(
    cache,
    events,
    docker,
    log,
    context,
    compose,
    orchestratorVersion,
    userConfRoot,
  ) {
    super();

    /**
     * The underlying LandoDaemon instance that performs all actual work.
     * @type {LandoDaemon}
     * @private
     */
    this._daemon = new LandoDaemon(
      cache,
      events,
      docker,
      log,
      context,
      compose,
      orchestratorVersion,
      userConfRoot,
    );
  }

  // ── Live-proxy properties ──────────────────────────────────────────
  // These getters (and setter for isRunning) delegate directly to the
  // underlying _daemon instance so callers always see the current value
  // rather than a stale snapshot copied at construction time.

  /** @type {string} */
  get platform() { return this._daemon.platform; }

  /** @type {boolean} */
  get isRunning() { return this._daemon.isRunning; }
  set isRunning(val) { this._daemon.isRunning = val; }

  /** @type {Object} */
  get events() { return this._daemon.events; }

  /** @type {string|false} */
  get compose() { return this._daemon.compose; }

  /** @type {string|false} */
  get docker() { return this._daemon.docker; }

  /**
   * Start the Docker engine.
   *
   * Delegates to {@link LandoDaemon#up} which handles all platform-specific
   * start logic (macOS `open`, Linux systemd scripts, Windows/WSL PowerShell).
   *
   * @param {boolean|Object} [retry=true] - Retry configuration.
   * @param {string} [password] - Optional sudo password for Linux.
   * @returns {Promise<void>}
   */
  async up(retry, password) {
    return this._daemon.up(retry, password);
  }

  /**
   * Stop the Docker engine.
   *
   * Delegates to {@link LandoDaemon#down}. No-ops on macOS, Windows, and WSL;
   * only actually stops the daemon on Linux in a node context.
   *
   * @returns {Promise<void>}
   */
  async down() {
    return this._daemon.down();
  }

  /**
   * Check whether the Docker engine is currently running.
   *
   * Delegates to {@link LandoDaemon#isUp} with optional caching.
   *
   * @param {Object} [cache] - A Lando Cache instance for short-lived TTL caching.
   * @param {string} [docker] - Path to the docker binary to probe.
   * @returns {Promise<boolean>}
   */
  async isUp(cache, docker) {
    // Pass `undefined` for the `log` parameter — LandoDaemon.isUp() accepts
    // (log, cache, docker) but never uses `log` (it relies on this.debug
    // internally). The DaemonBackend interface drops the unused param.
    return this._daemon.isUp(undefined, cache, docker);
  }

  /**
   * Retrieve version information for Docker and related tooling.
   *
   * Returns an object with `compose`, `engine`, and `desktop` version strings
   * depending on the current platform.
   *
   * @returns {Promise<{compose: string, engine: string|false, desktop: string|false}>}
   */
  async getVersions() {
    return this._daemon.getVersions();
  }
}

module.exports = DockerDaemon;
