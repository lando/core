'use strict';

module.exports = async lando => {
  // only run if engine bootstrap or above and if engine/orchestrator have been installed
  if (lando._bootstrapLevel >= 3) {
    lando.log.verbose('build-engine exists: %s', lando.engine.dockerInstalled);
    lando.log.verbose('orchestrator exists: %s', lando.engine.composeInstalled);

    // BUILD ENGINE
    if (lando.engine.dockerInstalled === false) {
      if (lando.cli) {
        const dep = process.platform === 'linux' ? 'DOCKER ENGINE' : 'DOCKER DESKTOP';
        console.error(lando.cli.makeArt('noDockerDep', dep));
        process.exit(1);
      } else throw Error('docker could not be located!');
    }

    // ORCHESTRATOR
    if (lando.engine.composeInstalled === false) {
      if (lando.cli) {
        console.error(lando.cli.makeArt('noDockerDep', 'DOCKER COMPOSE'));
        process.exit(1);
      } else throw Error('docker-compose could not be located!');
    }
  }
};
