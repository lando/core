'use strict';

/**
 * @module backends/docker
 * @description Docker backend implementations for Lando's pluggable engine architecture.
 *
 * Exports concrete implementations of the DaemonBackend, ContainerBackend, and
 * ComposeBackend interfaces that wrap the existing Docker-based code
 * (LandoDaemon, Landerode, compose.js).
 *
 * @example
 * const {DockerDaemon, DockerContainer, DockerCompose} = require('./backends/docker');
 *
 * const daemon = new DockerDaemon(cache, events, dockerPath, log);
 * const container = new DockerContainer({socketPath: '/var/run/docker.sock'});
 * const compose = new DockerCompose();
 *
 * @since 4.0.0
 */
const DockerDaemon = require('./docker-daemon');
const DockerContainer = require('./docker-container');
const DockerCompose = require('./docker-compose');

module.exports = {DockerDaemon, DockerContainer, DockerCompose};
