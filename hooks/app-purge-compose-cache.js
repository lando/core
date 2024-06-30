'use strict';

module.exports = async (app, lando) => {
  // wipe the compose cache
  lando.cache.remove(app.composeCache);
  // reset v4 service state
  for (const service of app?.v4?.services ?? []) {
    service.info = undefined;
  }
};
