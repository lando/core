'use strict';

const os = require('os');
const path = require('path');

/**
 * Create a containerd-backed Engine instance.
 *
 * This is the containerd equivalent of `utils/setup-engine.js`. It creates
 * an Engine wired with:
 * - **ContainerdDaemon** — manages the containerd + buildkitd lifecycle
 * - **ContainerdContainer** — low-level container/network ops via nerdctl
 * - **NerdctlCompose** — compose orchestration via `nerdctl compose`
 *
 * The compose function follows the same `(cmd, datum) => Promise` contract
 * as the Docker path in `setup-engine.js`:
 *
 * ```
 * const compose = (cmd, datum) => {
 *   const run = nerdctlCompose[cmd](datum.compose, datum.project, datum.opts);
 *   return shell.sh([nerdctlBin, ...run.cmd], run.opts);
 * };
 * ```
 *
 * ## Usage
 *
 * ```js
 * const setupContainerdEngine = require('../utils/setup-engine-containerd');
 * lando.engine = setupContainerdEngine(lando.config, lando.cache, lando.events, lando.log, lando.shell, lando.config.instance);
 * ```
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
  const {ContainerdDaemon, ContainerdContainer, NerdctlCompose} = require('../lib/backends/containerd');

  const userConfRoot = config.userConfRoot || path.join(os.homedir(), '.lando');

  // Resolve binary paths — config overrides take precedence, then standard ~/.lando/bin/ locations
  const containerdBin = config.containerdBin || path.join(userConfRoot, 'bin', 'containerd');
  const nerdctlBin = config.nerdctlBin || path.join(userConfRoot, 'bin', 'nerdctl');
  const buildkitdBin = config.buildkitdBin || path.join(userConfRoot, 'bin', 'buildkitd');
  const socketPath = config.containerdSocket || path.join(userConfRoot, 'run', 'containerd.sock');

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

  // Create the container backend — low-level container/network ops via nerdctl
  const docker = new ContainerdContainer({
    nerdctlBin,
    socketPath,
    id,
    debug: require('./debug-shim')(log),
  });

  // Create the compose backend — produces {cmd, opts} shell descriptors
  const nerdctlCompose = new NerdctlCompose({
    socketPath,
  });

  // Create the compose function with the standard (cmd, datum) => Promise contract.
  // Gets {cmd, opts} from NerdctlCompose, then executes via shell.sh([nerdctlBin, ...cmd], opts).
  const compose = (cmd, datum) => {
    const run = nerdctlCompose[cmd](datum.compose, datum.project, datum.opts);
    return shell.sh([nerdctlBin].concat(run.cmd), run.opts);
  };

  return new Engine(daemon, docker, compose, config);
};
