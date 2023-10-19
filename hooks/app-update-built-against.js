'use strict';

const _ = require('lodash');

// Update built against
const updateBuiltAgainst = (app, version = 'unknown') => {
  app.meta = _.merge({}, app.meta, {builtAgainst: version});
  return app.meta;
};

module.exports = async (app, lando) => {
  lando.cache.set(app.metaCache, updateBuiltAgainst(app, app._config.version), {persist: true});
};
