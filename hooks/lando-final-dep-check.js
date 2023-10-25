'use strict';

module.exports = async lando => {
  if (lando._bootstrapLevel >= 3) {
    lando.log.verbose('docker-engine exists: %s', lando.engine.dockerInstalled);
    if (lando.engine.dockerInstalled === false) {
      if (lando.cli) console.error(lando.cli.makeArt('noDockerDep'));
      throw Error('docker could not be located!');
    }
    // Throw NO DOCKER COMPOSE error
    lando.log.verbose('docker-compose exists: %s', lando.engine.composeInstalled);
    if (lando.engine.composeInstalled === false) {
      if (lando.cli) console.error(lando.cli.makeArt('noDockerDep', 'docker-compose'));
      throw Error('docker-compose could not be located!');
    }
  }
};
