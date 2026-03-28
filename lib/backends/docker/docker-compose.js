'use strict';

const {ComposeBackend} = require('../engine-backend');
const compose = require('../../compose');

/**
 * Docker Compose implementation of the ComposeBackend interface.
 *
 * Wraps the existing `lib/compose.js` module, delegating every orchestration
 * command to the corresponding exported function. Each method returns a
 * synchronous `{cmd, opts}` shell descriptor exactly as the existing module
 * does — the shell execution layer handles actual command invocation.
 *
 * @extends ComposeBackend
 * @since 4.0.0
 */
class DockerCompose extends ComposeBackend {
  /**
   * Create a DockerCompose backend.
   *
   * No configuration is required — the underlying compose module is
   * stateless and uses the same flag-mapping and option-parsing logic
   * that Lando has always used.
   */
  constructor() {
    super();
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
    return compose.build(composeFiles, project, opts);
  }

  /**
   * Get the container ID(s) for services in a compose project.
   *
   * Equivalent to `docker-compose ps -q`.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Options (e.g. `{services: ['web']}`).
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  getId(composeFiles, project, opts) {
    return compose.getId(composeFiles, project, opts);
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
    return compose.kill(composeFiles, project, opts);
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
    return compose.logs(composeFiles, project, opts);
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
    return compose.pull(composeFiles, project, opts);
  }

  /**
   * Remove containers (and optionally volumes/networks) for a compose project.
   *
   * Uses `docker-compose down` when `opts.purge` is `true`, otherwise
   * `docker-compose rm`.
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
    return compose.remove(composeFiles, project, opts);
  }

  /**
   * Execute a command inside a running service container.
   *
   * Maps to `docker-compose exec` semantics. Handles background-ampersand
   * detection and converts to `--detach` mode automatically.
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
    return compose.run(composeFiles, project, opts);
  }

  /**
   * Start containers for a compose project.
   *
   * Equivalent to `docker-compose up` with detach and orphan removal defaults.
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
    return compose.start(composeFiles, project, opts);
  }

  /**
   * Stop running containers in a compose project.
   *
   * Equivalent to `docker-compose stop`.
   *
   * @param {Array<string>} composeFiles - Paths to docker-compose files.
   * @param {string} project - The project/app name.
   * @param {Object} [opts={}] - Stop options.
   * @param {Array<string>} [opts.services] - Services to stop.
   * @returns {{cmd: string[], opts: Object}} Shell descriptor.
   */
  stop(composeFiles, project, opts) {
    return compose.stop(composeFiles, project, opts);
  }
}

module.exports = DockerCompose;
