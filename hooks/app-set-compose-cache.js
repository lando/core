'use strict';

module.exports = async (app, lando) => {
  lando.cache.set(app.composeCache, {
    name: app.name,
    project: app.project,
    compose: app.compose,
    containers: app.containers,
    root: app.root,
    info: app.info,
    overrides: {
      tooling: app._coreToolingOverrides,
    },
  }, {persist: true});
};
