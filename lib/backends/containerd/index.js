'use strict';

/**
 * @module backends/containerd
 * @description Containerd backend implementations for Lando's pluggable engine architecture.
 *
 * Exports concrete implementations of the DaemonBackend interface (and future
 * ContainerBackend / ComposeBackend) that manage Lando's own isolated
 * containerd + buildkitd + nerdctl stack.
 *
 * @example
 * const {ContainerdDaemon} = require('./backends/containerd');
 *
 * const daemon = new ContainerdDaemon({
 *   userConfRoot: '~/.lando',
 *   events,
 *   cache,
 *   log,
 * });
 *
 * @since 4.0.0
 */
const ContainerdDaemon = require('./containerd-daemon');

module.exports = {ContainerdDaemon};
