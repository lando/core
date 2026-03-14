'use strict';

const _ = require('lodash');

module.exports = async lando => {
  // only run if engine bootstrap or above, containerd backend, and daemon is available
  if (lando._bootstrapLevel >= 3) {
    const backend = _.get(lando, 'engine.engineBackend', _.get(lando, 'config.engine', 'auto'));
    if (backend === 'containerd' && lando.engine.dockerInstalled) {
      lando.engine.getCompatibility().then(results => {
        lando.log.verbose('checking containerd version compatibility...');
        lando.log.debug('containerd compatibility results', _.keyBy(results, 'name'));
        lando.cache.set('versions', _.assign(lando.versions, _.keyBy(results, 'name')), {persist: true});
        lando.versions = lando.cache.get('versions');
      });
    }
  }
};
