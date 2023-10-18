'use strict';

const _ = require('lodash');

/*
 * Gets the current env var and returns the key needed for metrics
 */
const getMetricsContext = () => {
  if (_.has(process, 'env.GITPOD_WORKSPACE_ID') || _.has(process, 'env.CODESPACES')) {
    return 'remote';
  } else if ( _.has(process, 'env.CI')) {
    return 'ci';
  } else {
    return 'local';
  }
};

module.exports = (log, config) => {
  const Metrics = require('./../lib/metrics');
  const command = _.get(config, 'command._', 'unknown');
  return new Metrics({
    log,
    id: config.id,
    endpoints: config.stats,
    data: {
      command: `lando ${command}`,
      context: getMetricsContext(),
      devMode: false,
      instance: config.instance || 'unknown',
      nodeVersion: process.version,
      mode: config.mode || 'unknown',
      os: config.os,
      product: config.product,
      version: config.version,
    },
  });
};
