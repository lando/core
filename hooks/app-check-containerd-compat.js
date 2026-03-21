'use strict';

const _ = require('lodash');

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

    // handle nerdctl (compose equivalent) recommend update
    if (thing.name === 'nerdctl' && thing.rupdate) {
      app.addMessage(require('../messages/update-nerdctl-warning')(thing));
    }
  });

  // Run live containerd-specific health checks
  try {
    const daemon = lando.engine.daemon;

    // Verify containerd daemon is running
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

    // Verify nerdctl compose is functional
    if (isUp) {
      try {
        const runCommand = require('../utils/run-command');
        await runCommand(daemon.nerdctlBin, ['compose', 'version'], {
          debug: daemon.debug,
          ignoreReturnCode: false,
        });
      } catch (err) {
        app.addMessage({
          type: 'warning',
          title: 'nerdctl compose is not functional',
          detail: [
            'Could not run "nerdctl compose version" successfully.',
            'nerdctl compose is required for service orchestration.',
            `Error: ${err.message}`,
          ],
          url: 'https://github.com/containerd/nerdctl/releases',
        });
      }

      // Verify buildkitd socket exists (systemd service manages the process)
      const fs = require('fs');
      if (!fs.existsSync(daemon.buildkitSocket)) {
        app.addMessage({
          type: 'warning',
          title: 'BuildKit daemon is not running',
          detail: [
            'The BuildKit daemon (buildkitd) does not appear to be running.',
            'BuildKit is required for building container images with the containerd backend.',
            'Run "lando setup" to install and start the containerd engine service.',
          ],
          url: 'https://github.com/moby/buildkit/releases',
        });
      }
    }
  } catch (err) {
    lando.log.debug('containerd health check encountered an error: %s', err.message);
  }
};
