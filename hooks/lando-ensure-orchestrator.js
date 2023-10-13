'use strict';

module.exports = async lando => {
  if (!!!lando.config.orchestratorBin) lando.config.orchestratorBin = require('./../utils/get-compose-x')(lando.config);
  lando.log.debug('using docker-compose %s', lando.config.orchestratorBin);
};
