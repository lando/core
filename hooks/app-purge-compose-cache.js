'use strict';

module.exports = async (app, lando) => {
  // reset v4 service state
  for (const service of app?.v4?.services ?? []) service.info = undefined;

  // reset tooling overrides
  app._coreToolingOverrides = {};

  // wipe the compose cache
  lando.cache.remove(app.composeCache);
};
