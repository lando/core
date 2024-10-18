'use strict';

const fs = require('fs');
const path = require('path');
const remove = require('../utils/remove');

module.exports = async (app, lando) => {
  // reset v4 service state
  for (const service of app?.v4?.services ?? []) service.info = undefined;

  // reset tooling overrides
  app._coreToolingOverrides = {};

  // remove compose cache danglerz
  fs.readdirSync(app._dir)
    .map(dangler => path.join(app._dir, dangler))
    .filter(dangler => !app.compose.includes(dangler))
    .map(dangler => {
      try {
        remove(dangler);
      } catch {
        app.log.info('Could not remove dangling compose file %s', dangler);
        return dangler;
      }
    });

  // wipe the compose cache
  lando.cache.remove(app.composeCache);
};
