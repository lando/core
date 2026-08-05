'use strict';

const exists = require('./exists-sync');
const merge = require('lodash/merge');
const read = require('./read-file');

module.exports = (file, config = {}) => {
  // if config file exists then rebase config on top of it
  if (exists(file)) return merge({}, read(file), config);
  // otherwise return config alone
  return config;
};
