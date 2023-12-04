'use strict';

const get = require('lodash/get');
const getKeys = require('./get-object-keys');
const path = require('path');
const set = require('lodash/set');

const defaultPathyKeys = ['hooks', 'registry', 'tasks'];

module.exports = (data = {}, base, pathyKeys = defaultPathyKeys) => {
  // @TODO: error handling?

  for (const key of getKeys(data)) {
    // skip if not a pathy key
    if (!defaultPathyKeys.includes(key.split('.')[0])) continue;
    // reset data to be an absolute path
    // @TODO: should we test if abolute path exists?
    if (key && typeof get(data, key) === 'string' && !path.isAbsolute(get(data, key))) {
      set(data, key, path.resolve(base, get(data, key)));
    }
  }

  // then return
  return data;
};
