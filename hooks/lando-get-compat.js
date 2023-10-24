'use strict';

const _ = require('lodash');

module.exports = async lando => {
  if (lando._bootstrapLevel >= 3) {
    lando.engine.getCompatibility().then(results => {
      lando.log.verbose('checking docker version compatibility...');
      lando.log.debug('compatibility results', _.keyBy(results, 'name'));
      lando.cache.set('versions', _.assign(lando.versions, _.keyBy(results, 'name')), {persist: true});
      lando.versions = lando.cache.get('versions');
    });
  }
};
