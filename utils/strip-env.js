'use strict';

const _ = require('lodash');

module.exports = prefix => {
  // Strip it down
  _.each(process.env, (value, key) => {
    if (_.includes(key, prefix)) {
      delete process.env[key];
    }
  });

  // Return
  return process.env;
};
