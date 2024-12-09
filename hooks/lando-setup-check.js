'use strict';

module.exports = async lando => {
  // fetch the command we are running
  const command = lando?.config?.command?._?.[0] ?? 'unknown';

  // only run if engine bootstrap or above and if engine/orchestrator have been installed
  if (lando._bootstrapLevel >= 3 && command !== 'setup') {
    lando.log.verbose('build-engine exists: %s', lando.engine.dockerInstalled);
    lando.log.verbose('orchestrator exists: %s', lando.engine.composeInstalled);

    // if we cannot even locate the buld engine then go into run setup
    // @NOTE: this is mostly a catch-all fail-safe fall-back in case something
    // gets through the setup cracks
    if (lando.engine.dockerInstalled === false) {
      await require('./lando-run-setup')(lando);
    }
  }
};
