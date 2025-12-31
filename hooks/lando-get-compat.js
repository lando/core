'use strict';

const _ = require('lodash');

module.exports = async lando => {
  // only run if engine bootstrap or above and if engine/orchestrator have been installed
  if (lando._bootstrapLevel >= 3) {
    if (lando.engine.composeInstalled && lando.engine.dockerInstalled) {
      if (!await lando.cache.isOlderThanMinutes('versions')) {
        return;
      }

      lando.engine.getCompatibility().then(results => {
        lando.log.verbose('checking docker version compatibility...');
        lando.log.debug('compatibility results', _.keyBy(results, 'name'));
        const lastLandoVersions = _.cloneDeep(lando.versions);
        _.assign(lando.versions, _.keyBy(results, 'name'));
        if (_.isEqual(lando.versions, lastLandoVersions)) {
          return;
        }
        lando.cache.set('versions', lando.versions, {persist: true});
        lando.versions = lando.cache.get('versions');
      });
    }
  }
};
