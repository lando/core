'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  lando.cache.set(app.v4.composeCache, {
    name: app.name,
    project: app.project,
    compose: app.compose,
    containers: app.containers,
    root: app.root,
    info: app.info,
    mounts: require('../utils/get-mounts')(_.get(app, 'v4.services', {})),
    overrides: {
      tooling: app._coreToolingOverrides,
    },
  }, {persist: true});
};
