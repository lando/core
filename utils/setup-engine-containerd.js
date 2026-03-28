'use strict';

const os = require('os');
const path = require('path');

const getContainerdPaths = require('./get-containerd-paths');

/**
 * Create a containerd-backed Engine instance.
 *
 * @deprecated This utility is **not used in production**. The containerd engine
 * is now created via `BackendManager._createContainerdEngine()` in
 * `lib/backend-manager.js`, which uses `docker-compose` + `DOCKER_HOST` instead
 * of `NerdctlCompose`. This file is retained for reference only and may be
 * removed in a future release.
 *
 * This is the containerd equivalent of `utils/setup-engine.js`. It creates
 * an Engine wired with:
 * - **ContainerdDaemon** — manages the containerd + buildkitd lifecycle
 * - **ContainerdContainer** — low-level container/network ops via Dockerode + finch-daemon
 * - **NerdctlCompose** — compose orchestration via `nerdctl compose` (deprecated)
 *
 * @param {Object} config - The full Lando config object.
 * @param {Object} cache  - A Lando Cache instance.
 * @param {Object} events - A Lando Events instance.
 * @param {Object} log    - A Lando Log instance.
 * @param {Object} shell  - A Lando Shell instance.
 * @param {string} [id='lando'] - The Lando instance identifier.
 * @returns {Engine} A fully configured Engine instance using containerd backends.
 *
 * @since 4.0.0
 */
module.exports = (config, cache, events, log, shell, id = 'lando') => {
  const Engine = require('../lib/engine');
  const {ContainerdDaemon, ContainerdContainer} = require('../lib/backends/containerd');
  const NerdctlCompose = require('../lib/backends/containerd/nerdctl-compose');

  const userConfRoot = config.userConfRoot || path.join(os.homedir(), '.lando');
  const paths = getContainerdPaths(config);
  const systemBinDir = config.containerdSystemBinDir || '/usr/local/lib/lando/bin';

  // Resolve binary paths — config overrides take precedence, then standard ~/.lando/bin/ locations
  const containerdBin = config.containerdBin || path.join(systemBinDir, 'containerd');
  const nerdctlBin = config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
  const buildkitdBin = config.buildkitdBin || path.join(systemBinDir, 'buildkitd');
  const socketPath = paths.containerdSocket;

  // Create the daemon backend — manages containerd + buildkitd lifecycle
  const daemon = new ContainerdDaemon({
    userConfRoot,
    containerdBin,
    buildkitdBin,
    nerdctlBin,
    socketPath,
    events,
    cache,
    log,
  });

  // Create the container backend — low-level container/network ops via Dockerode + finch-daemon
  // ContainerdContainer uses Dockerode pointed at finch-daemon's Docker-compatible socket
  // instead of shelling out to nerdctl. finch-daemon provides Docker API v1.43 compat backed
  // by containerd.
  const docker = new ContainerdContainer({
    finchSocket: paths.finchSocket,
    id,
    debug: require('./debug-shim')(log),
  });

  // Create the compose backend — produces {cmd, opts} shell descriptors
  const nerdctlCompose = new NerdctlCompose({
    socketPath,
    buildkitHost: `unix://${daemon.buildkitSocket}`,
    namespace: 'default',
    nerdctlConfig: path.join(userConfRoot, 'config', 'nerdctl.toml'),
  });

  // Create the compose function with the standard (cmd, datum) => Promise contract.
  // Gets {cmd, opts} from NerdctlCompose, then executes via shell.sh([nerdctlBin, ...cmd], opts).
  const compose = (cmd, datum) => {
    const run = nerdctlCompose[cmd](datum.compose, datum.project, datum.opts);
    return shell.sh([nerdctlBin].concat(run.cmd), run.opts);
  };

  return new Engine(daemon, docker, compose, config);
};
