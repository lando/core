'use strict';

module.exports = async (app, lando) => {
  app.log.verbose('removing tooling and services cache...');
  lando.cache.remove(app.toolingCache);
};
