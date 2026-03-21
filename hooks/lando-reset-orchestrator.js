'use strict';

module.exports = async lando => {
  // Containerd engine manages its own compose binary — skip Docker-era workaround
  if (lando.engine?.engineBackend === 'containerd' || lando.config.engine === 'containerd') {
    lando.log.debug('using docker-compose %s', lando.config.orchestratorBin);
    return;
  }

  // if we dont have an orchestrator bin yet then discover it
  if (!lando.config.orchestratorBin) lando.config.orchestratorBin = require('../utils/get-compose-x')(lando.config);

  // because the entire lando 3 runtime was made in a bygone era when we never dreamed of doing stuff like this
  // we need this workaround
  if (lando._bootstrapLevel >= 3 && !lando.engine.composeInstalled) {
    lando.engine = lando.engine = require('../utils/setup-engine')(
      lando.config,
      lando.cache,
      lando.events,
      lando.log,
      lando.shell,
      lando.config.instance,
    );
  }

  // log our sitch
  lando.log.debug('using docker-compose %s', lando.config.orchestratorBin);
};
