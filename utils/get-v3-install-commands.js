'use strict';

const _ = require('lodash');

// checks to see if a setting is disabled
module.exports = (overrides = {}) => {
  const newOverrides = _.cloneDeep(overrides);
  if (_.has(newOverrides, 'image')) delete newOverrides.image;
  if (_.has(newOverrides, 'build')) delete newOverrides.build;
  return newOverrides;
};

