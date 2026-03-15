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
 *   nerdctlBin: daemon.nerdctlBin,
 *   socketPath: daemon.socketPath,
 * });
 *
 * const compose = new NerdctlCompose({
 *   socketPath: daemon.socketPath,
 * });
 *
 * @since 4.0.0
 */
const ContainerdDaemon = require('./containerd-daemon');
const ContainerdContainer = require('./containerd-container');
const NerdctlCompose = require('./nerdctl-compose');

module.exports = {ContainerdDaemon, ContainerdContainer, NerdctlCompose};
