'use strict';

const {ComposeBackend} = require('../engine-backend');
const compose = require('../../compose');
const {getContainerdAuthConfig} = require('../../../utils/setup-containerd-auth');

/**
 * nerdctl compose implementation of the ComposeBackend interface.
 *
 * Wraps the existing `lib/compose.js` module — the same one used by DockerCompose —
 * and transforms every returned `{cmd, opts}` shell descriptor so that commands target
 * `nerdctl compose` instead of `docker compose`.
 *
 * ### How it works
 *
 * `compose.js` builds command arrays like:
 * ```
 * ['--project-name', 'myapp', '--file', 'docker-compose.yml', 'up', '--detach', ...]
 * ```
 *
 * The shell execution layer prepends the binary path, so for Docker you get:
 * ```
 * docker compose --project-name myapp --file docker-compose.yml up --detach ...
 * ```
 *
 * For nerdctl the equivalent is:
 * ```
 * nerdctl --address /run/containerd/containerd.sock compose --project-name myapp --file docker-compose.yml up --detach ...
 * ```
 *
 * So we delegate to `compose.*()` for all the complex flag-mapping and option-parsing
 * logic, then prepend `['--address', socketPath, 'compose']` to the resulting cmd array.
 * The shell layer prepends the nerdctl binary path.
 *
 * @extends ComposeBackend
 * @since 4.0.0
 */
class NerdctlCompose extends ComposeBackend {
  /**
   * Create a NerdctlCompose backend.
   *
   * @param {Object} [opts={}] - Configuration options.
   * @param {string} [opts.socketPath='/run/containerd/containerd.sock'] - Path to the
   *   containerd socket. Passed as `--address` to nerdctl before the `compose` subcommand.
   * @param {Object} [opts.authConfig] - Registry auth configuration from `getContainerdAuthConfig()`.
   *   When provided, its `env` object is merged into command opts to ensure nerdctl
   *   finds the Docker config for private registry authentication.
   */
  constructor(opts = {}) {
    super();

    /**
     * Path to the containerd socket.
     * @type {string}
     */
    this.socketPath = opts.socketPath || '/run/containerd/containerd.sock';

    /**
     * Whether running in rootless mode (skip --address flag).
     * @type {boolean}
     */
    this.useRootless = opts.useRootless || false;

    /**
     * Registry auth configuration.
     * @type {{dockerConfig: string, env: Object, configExists: boolean, credentialHelpers: string[]}}
     */
    this.authConfig = opts.authConfig || getContainerdAuthConfig();
  }

  /**
   * Transform a compose.js shell descriptor for nerdctl.
   *
   * Prepends `['--address', socketPath, 'compose']` to the cmd array so that
   * the shell layer produces:
   *   nerdctl --address <socket> compose <...existing args...>
   *
   * @param {{cmd: string[], opts: Object}} result - Shell descriptor from compose.js.
   * @returns {{cmd: string[], opts: Object}} Transformed shell descriptor for nerdctl.
   * @private
   */
  _transform(result) {
    const authEnv = this.authConfig && this.authConfig.env ? this.authConfig.env : {};
    const hasAuthEnv = Object.keys(authEnv).length > 0;

    // Merge auth env vars into opts.env when DOCKER_CONFIG needs to be set
    const opts = hasAuthEnv
      ? Object.assign({}, result.opts, {env: Object.assign({}, result.opts.env || process.env, authEnv)})
      : result.opts;

    return {
      cmd: (this.useRootless || !this.socketPath)
        ? ['compose', ...result.cmd]
        : ['--address', this.socketPath, 'compose', ...result.cmd],
      opts,
    };
  }

  /**
   * Build container images for the specified services.
   *
   * Filters `opts.local` against `opts.services` to determine which services
   * to build. If no local services match, falls back to a no-op `ps` command.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Build options.
   * @param {Array<string>} [opts.services] - Services to build (default: all).
   * @param {Array<string>} [opts.local] - Services with local Dockerfiles.
   * @param {boolean} [opts.noCache=false] - Bypass the build cache.
   * @param {boolean} [opts.pull=true] - Pull base images before building.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  build(composeFiles, project, opts) {
    return this._transform(compose.build(composeFiles, project, opts));
  }

  /**
   * Get the container ID(s) for services in a compose project.
   *
   * Equivalent to `nerdctl compose ps -q`.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Options (e.g. `{services: ['web']}`).
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  getId(composeFiles, project, opts) {
    return this._transform(compose.getId(composeFiles, project, opts));
  }

  /**
   * Send a SIGKILL to containers in a compose project.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Kill options.
   * @param {Array<string>} [opts.services] - Services to kill.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  kill(composeFiles, project, opts) {
    return this._transform(compose.kill(composeFiles, project, opts));
  }

  /**
   * Retrieve log output from containers in a compose project.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Logging options.
   * @param {boolean} [opts.follow=false] - Tail the logs.
   * @param {boolean} [opts.timestamps=false] - Include timestamps.
   * @param {Array<string>} [opts.services] - Services to get logs from.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  logs(composeFiles, project, opts) {
    return this._transform(compose.logs(composeFiles, project, opts));
  }

  /**
   * Pull images for services in a compose project.
   *
   * Filters `opts.pullable` against `opts.services` to determine which services
   * to pull. If no pullable services match, falls back to a no-op `ps` command.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Pull options.
   * @param {Array<string>} [opts.services] - Services to pull.
   * @param {Array<string>} [opts.pullable] - Services whose images can be pulled.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  pull(composeFiles, project, opts) {
    return this._transform(compose.pull(composeFiles, project, opts));
  }

  /**
   * Remove containers (and optionally volumes/networks) for a compose project.
   *
   * Uses `nerdctl compose down` when `opts.purge` is `true`, otherwise
   * `nerdctl compose rm`.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Removal options.
   * @param {boolean} [opts.purge=false] - Full teardown.
   * @param {boolean} [opts.force=true] - Force removal.
   * @param {boolean} [opts.volumes=true] - Remove anonymous volumes.
   * @param {Array<string>} [opts.services] - Services to remove.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  remove(composeFiles, project, opts) {
    return this._transform(compose.remove(composeFiles, project, opts));
  }

  /**
   * Execute a command inside a running service container.
   *
   * Maps to `nerdctl compose exec` semantics. Handles background-ampersand
   * detection and converts to `--detach` mode automatically (delegated to
   * compose.js).
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Run/exec options.
   * @param {Array<string>} opts.cmd - The command and arguments to execute.
   * @param {Array<string>} [opts.services] - The service to run in.
   * @param {string} [opts.user] - User to execute as.
   * @param {Object} [opts.environment] - Additional environment variables.
   * @param {boolean} [opts.detach=false] - Run in background.
   * @param {boolean} [opts.noTTY] - Disable pseudo-TTY allocation.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  run(composeFiles, project, opts) {
    return this._transform(compose.run(composeFiles, project, opts));
  }

  /**
   * Start containers for a compose project.
   *
   * Equivalent to `nerdctl compose up` with detach and orphan removal defaults.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Start options.
   * @param {Array<string>} [opts.services] - Services to start.
   * @param {boolean} [opts.background=true] - Run in detached mode.
   * @param {boolean} [opts.recreate=false] - Force-recreate containers.
   * @param {boolean} [opts.noRecreate=true] - Do not recreate existing containers.
   * @param {boolean} [opts.removeOrphans=true] - Remove orphaned containers.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  start(composeFiles, project, opts) {
    return this._transform(compose.start(composeFiles, project, opts));
  }

  /**
   * Stop running containers in a compose project.
   *
   * Equivalent to `nerdctl compose stop`.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Stop options.
   * @param {Array<string>} [opts.services] - Services to stop.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  stop(composeFiles, project, opts) {
    return this._transform(compose.stop(composeFiles, project, opts));
  }
}

module.exports = NerdctlCompose;
