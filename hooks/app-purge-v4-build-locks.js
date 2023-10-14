'use strict';

module.exports = async (app, lando) => {
  lando.cache.remove(app.v4.preLockfile);
  lando.cache.remove(app.v4.postLockfile);
  app.log.debug('removed v4 build locks');
};
