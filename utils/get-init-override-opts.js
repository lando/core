'use strict';

const _ = require('lodash');

const getConfig = (data = [], name) => _.find(data, {name});

module.exports = (inits = [], recipes = [], sources = []) => {
  const opts = require('./get-init-aux-opts')(recipes);
  _.forEach(opts, (opt, key) => {
    const isRec = key === 'recipe';
    // NOTE: when seems like the most relevant override here, should we consider adding more?
    // are we restricted by access to the answers hash or when these things actually run?
    _.forEach(['when'], prop => {
      const overrideFunc = answers => {
        const config = isRec ? getConfig(sources, answers.source) : getConfig(inits, answers.recipe);
        if (_.has(config, `overrides.${key}.${prop}`) && _.isFunction(config.overrides[key][prop])) {
          return config.overrides[key][prop](answers);
        } else {
          return opt.interactive[prop](answers);
        }
      };
      opts[key] = _.merge({}, {interactive: _.set({}, prop, overrideFunc)});
    });
  });
  return opts;
};
