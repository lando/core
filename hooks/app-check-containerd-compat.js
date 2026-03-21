'use strict';

const _ = require('lodash');
const fs = require('fs');

/**
 * App-level containerd backend compatibility checks.
 *
 * Runs when the containerd backend is active to verify:
 * - Component version recommendations
 * - docker-compose availability (via finch-daemon Docker API)
 * - buildkitd socket availability
 *
 * Per BRIEF: never shell out to nerdctl from user-facing code. All checks
 * use Dockerode against finch-daemon or check socket/binary existence directly.
 *
 * @param {Object} app - The Lando app instance.
 * @param {Object} lando - The Lando instance.
 * @returns {Promise<void>}
 */
module.exports = async (app, lando) => {
  // Skip if not using the containerd backend
  const backend = _.get(lando, 'engine.engineBackend', _.get(lando, 'config.engine', 'auto'));
  if (backend !== 'containerd') return;

  _.forEach(_(lando.versions)
    .filter(version => version && version.name && !version.dockerVersion)
    .value(), thing => {
    // handle generic unsupported or untested notices
    if (!thing.satisfied) app.addMessage(require('../messages/unsupported-version-warning')({
      ...thing,
      name: thing.name,
    }));
    if (thing.untested) app.addMessage(require('../messages/untested-version-notice')(thing));

    // handle containerd backend component update recommendations
    if (thing.rupdate) {
      app.addMessage(require('../messages/update-containerd-warning')(thing));
    }
  });

  // Run live containerd-specific health checks
  try {
    const daemon = lando.engine.daemon;

    // Verify containerd daemon is running via Dockerode ping against finch-daemon
    // Per BRIEF: finch-daemon provides Docker API compatibility — use it.
    const isUp = await daemon.isUp();
    if (!isUp) {
      app.addMessage({
        type: 'warning',
        title: 'Containerd daemon is not running',
        detail: [
          'The containerd daemon does not appear to be running.',
          'Lando needs containerd to manage containers. Try running "lando start"',
          'which will attempt to start the daemon automatically.',
        ],
      });
    }

    // Verify docker-compose is functional with finch-daemon
    // Per BRIEF: compose operations use docker-compose with DOCKER_HOST, NOT nerdctl compose
    if (isUp) {
      try {
        const {execSync} = require('child_process');
        const finchSocket = _.get(daemon, 'finchDaemon.socketPath', '/run/lando/finch.sock');
        const composeBin = lando.config.orchestratorBin || 'docker-compose';
        execSync(`${composeBin} version`, {
          stdio: 'ignore',
          env: {...process.env, DOCKER_HOST: `unix://${finchSocket}`},
        });
      } catch (err) {
        app.addMessage({
          type: 'warning',
          title: 'docker-compose is not functional',
          detail: [
            'Could not run "docker-compose version" successfully.',
            'docker-compose is required for service orchestration with the containerd backend.',
            'It communicates with finch-daemon via the DOCKER_HOST environment variable.',
            `Error: ${err.message}`,
          ],
          url: 'https://docs.lando.dev/config/engine.html',
        });
      }

      // Verify buildkitd socket exists (systemd service manages the process)
      if (!fs.existsSync(daemon.buildkitSocket)) {
        app.addMessage({
          type: 'warning',
          title: 'BuildKit daemon is not running',
          detail: [
            'The BuildKit daemon (buildkitd) does not appear to be running.',
            'BuildKit is required for building container images with the containerd backend.',
            'Run "lando setup" to install and start the containerd engine service.',
          ],
          url: 'https://docs.lando.dev/config/engine.html',
        });
      }
    }
  } catch (err) {
    lando.log.debug('containerd health check encountered an error: %s', err.message);
  }
};
