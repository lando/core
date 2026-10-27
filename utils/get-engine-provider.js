'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * @typedef {Object} EngineProvider
 * @property {string} name - docker-desktop, orbstack, rancher or podman
 * @property {string} app - the macOS app bundle (or, for podman, the cli) that runs the engine
 * @property {string} socketPath - the docker socket the engine serves
 * @property {string[]} [start] - command that starts the engine, absent for docker-desktop which has its own logic
 * @property {boolean} [unprivilegedPorts] - published ports are bound by an unprivileged process, so no ports < 1024
 * @property {boolean} [selinux] - the engine vm enforces selinux, so the proxy's docker socket mount needs label=disable
 */

/**
 * Resolves which container engine Lando drives on macOS.
 *
 * `auto` keeps the historical behavior: Docker Desktop if it is installed,
 * otherwise the first of OrbStack or Rancher Desktop that is.
 *
 * @param {string} [name='auto'] - auto, docker-desktop, orbstack, rancher or podman (opt-in only)
 * @param {Object} [opts] - home and tmp dirs, exists(path) and which(bin), injectable for tests
 * @return {EngineProvider} The resolved provider.
 */
module.exports = (name = 'auto', {
  home = os.homedir(),
  tmpdir = os.tmpdir(),
  exists = fs.existsSync,
  which = bin => String(require('shelljs').which(bin) ?? ''),
} = {}) => {
  const podman = which('podman') || '/opt/homebrew/bin/podman';
  // start uses each engine's own cli: re-opening an app whose engine was stopped (but whose menu bar app still runs)
  // is a no-op, so `open -a` cannot be relied on to bring the engine back
  const providers = {
    'docker-desktop': {app: '/Applications/Docker.app', socketPath: '/var/run/docker.sock'},
    'orbstack': {
      app: '/Applications/OrbStack.app',
      socketPath: path.join(home, '.orbstack', 'run', 'docker.sock'),
      start: ['/Applications/OrbStack.app/Contents/MacOS/bin/orbctl', 'start'],
    },
    // rancher must run in dockerd (moby) mode, containerd mode cannot run lando
    'rancher': {
      app: '/Applications/Rancher Desktop.app',
      socketPath: path.join(home, '.rd', 'docker.sock'),
      start: ['/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin/rdctl', 'start'],
    },
    // podman's default machine serves the docker-compatible api from $TMPDIR on macOS; it should be rootful
    // (podman machine set --rootful) so lando can bind 80/443 and bind mounts keep docker-like ownership
    'podman': {
      app: podman,
      socketPath: path.join(tmpdir, 'podman', 'podman-machine-default-api.sock'),
      start: [podman, 'machine', 'start'],
      // gvproxy publishes ports as the user, and macOS refuses < 1024 on a specific ip to non-root
      unprivilegedPorts: true,
      // the machine is fedora coreos with selinux enforcing: socket mounts need label=disable
      selinux: true,
    },
  };

  // podman is opt-in: having the cli installed does not mean a machine exists
  const autoCandidates = Object.keys(providers).filter(key => key !== 'podman');
  if (name === 'auto') name = autoCandidates.find(key => exists(providers[key].app)) ?? 'docker-desktop';
  if (!providers[name]) {
    throw new Error(`Unknown engineProvider "${name}", use one of auto, ${Object.keys(providers).join(', ')}`);
  }

  return {name, ...providers[name]};
};
