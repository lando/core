'use strict';

module.exports = async (app, lando) => lando.cache.remove(app.composeCache);
