'use strict';

/**
 * @module backends
 * @description Pluggable engine backend interfaces for Lando.
 *
 * Exports the base classes that define the contracts for any container engine backend
 * (Docker, containerd/nerdctl, etc.). Concrete implementations should extend these
 * classes and override every method.
 *
 * @example
 * const {EngineBackend, DaemonBackend, ContainerBackend, ComposeBackend} = require('./backends');
 *
 * class MyDaemon extends DaemonBackend {
 *   async up(retry, password) { ... }
 *   async down() { ... }
 *   async isUp(cache, docker) { ... }
 *   async getVersions() { ... }
 * }
 *
 * @since 4.0.0
 */
module.exports = require('./engine-backend');
