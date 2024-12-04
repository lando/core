'use strict';

const _ = require('lodash');

module.exports = (all, lando, options = {}) => {
  _.forEach(all, one => {
    if (_.has(one, 'options')) {
      _.forEach(one.options(lando), () => {
        // @TODO: get auto conflict assignment to work properly
        // @NOTE: maybe it doesn't and we should just do this manually?
        // _.set(options, `${key}.conflicts`, getConflicts(one.name, all, lando));
      });
      options = _.merge({}, one.options(lando), options);
    }
  });
  return options;
};
