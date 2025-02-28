'use strict';

const _ = require('lodash');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

// Helper to get init config
const getLegacyInitConfig = dirs => _(dirs)
  .filter(dir => fs.existsSync(dir))
  .flatMap(dir => glob.sync(path.join(dir, '*', 'init.js')))
  .map(file => require(file))
  .value();

// Helper to get init config
const getInitConfig = dirs => _(dirs)
  .filter(dir => fs.existsSync(dir))
  .flatMap(dir => fs.readdirSync(dir).map(file => path.join(dir, file)))
  .map(file => require(file))
  .value();

// Helper to get init source config
const getInitSourceConfig = dirs => _(dirs)
  .filter(dir => fs.existsSync(dir))
  .flatMap(dir => glob.sync(path.join(dir, '*.js')))
  .map(file => require(file))
  .flatMap(source => source.sources)
  .value();

module.exports = async lando => {
  const legacyInits = getLegacyInitConfig(_.map(lando.config.plugins, 'recipes'));
  const inits = getInitConfig(_.map(lando.config.plugins, 'inits'));

  lando.config.inits = _.sortBy(_.map(_.merge(
    {},
    _.fromPairs(_.map(legacyInits, init => ([init.name, init]))),
    _.fromPairs(_.map(inits, init => ([init.name, init]))),
  ), init => init), 'name');

  // Load in config frmo sources
  const sources = getInitSourceConfig(_.map(lando.config.plugins, 'sources'));
  const initSources = _(lando.config.inits)
    .filter(init => _.has(init, 'sources'))
    .flatMap(init => init.sources)
    .value();

  lando.config.sources = _.sortBy(sources.concat(initSources), 'label');

  // And finally the recipes
  lando.config.recipes = _.sortBy(_.map(lando.config.inits, init => init.name), 'name');
};
