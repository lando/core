'use strict';

const _ = require('lodash');

module.exports = (overrides, base = '.', volumes = {}) => {
  // Normalize any build paths
  if (_.has(overrides, 'build')) {
    if (_.isObject(overrides.build) && _.has(overrides, 'build.context')) {
      overrides.build.context = require('./normalize-path')(overrides.build.context, base);
    } else {
      overrides.build = require('./normalize-path')(overrides.build, base);
    }
  }
  // Normalize any volumes
  if (_.has(overrides, 'volumes')) {
    overrides.volumes = _.map(overrides.volumes, volume => {
      if (!_.includes(volume, ':')) {
        return volume;
      } else {
        const local = require('./get-host-path')(volume);
        const remote = _.last(volume.split(':'));
        // @TODO: I don't think below does anything?
        const excludes = _.keys(volumes).concat(_.keys(volumes));
        const host = require('./normalize-path')(local, base, excludes);
        return [host, remote].join(':');
      }
    });
  }
  return overrides;
};
