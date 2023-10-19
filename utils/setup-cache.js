'use strict';

const path = require('path');

const {nanoid} = require('nanoid');

module.exports = (log, config) => {
  const Cache = require('./../lib/cache');
  const cache = new Cache({log, cacheDir: path.join(config.userConfRoot, 'cache')});
  if (!cache.get('id')) cache.set('id', nanoid(), {persist: true});
  config.user = cache.get('id');
  config.id = config.user;
  return cache;
};
