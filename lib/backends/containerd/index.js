'use strict';

/**
 * @module backends/containerd
 * @description Containerd backend implementations for Lando's pluggable engine architecture.
 *
 * Exports concrete implementations of the DaemonBackend and ContainerBackend
 * interfaces that manage Lando's own isolated containerd + buildkitd + finch-daemon stack.
 *
 * Compose operations use `docker-compose` pointed at finch-daemon via `DOCKER_HOST`
 * (configured in `BackendManager._createContainerdEngine()`), NOT `nerdctl compose`.
 *
 * @example
 * const {ContainerdDaemon, ContainerdContainer} = require('./backends/containerd');
 *
 * const daemon = new ContainerdDaemon({
 *   userConfRoot: '~/.lando',
 *   events,
 *   cache,
 *   log,
 * });
 *
 * const container = new ContainerdContainer({
 *   finchSocket: daemon.finchDaemon.getSocketPath(),
 *   id: 'myapp',
 * });
 *
 * @since 4.0.0
 */
const ContainerdDaemon = require('./containerd-daemon');
const ContainerdContainer = require('./containerd-container');
const ContainerdProxyAdapter = require('./proxy-adapter');

module.exports = {ContainerdDaemon, ContainerdContainer, ContainerdProxyAdapter};
