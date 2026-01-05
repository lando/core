'use strict';

const _ = require('lodash');

module.exports = function(more = {}) {
  let githubEnvVars = {};
  if (process.env.GITHUB_ENV) {
    githubEnvVars = JSON.parse(process.env.GITHUB_ENV);
  }

  return _.merge({}, {
    PHP_MEMORY_LIMIT: '-1',
  }, githubEnvVars, more);
};
