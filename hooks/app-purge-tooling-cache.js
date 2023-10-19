'use strict';

module.exports = async (app, lando) => {
  app.log.verbose('removing tooling cache...');
  lando.cache.remove(app.toolingCache);
};
