'use strict';

const _ = require('lodash');
const fs = require('fs');
const lmerge = require('./legacy-merge');
const path = require('path');
const yaml = require('../components/yaml');

/*
 * Helper to load landofile
 */
const loadLandoFile = file => {
  try {
    return yaml.load(fs.readFileSync(file));
  } catch (e) {
    console.error(file, e);
    throw new Error(`There was a problem with parsing ${file}. Ensure it is valid YAML! ${e}`);
  }
};

module.exports = (files, userConfRoot) => {
  const config = lmerge({}, ..._.map(files, file => loadLandoFile(file)));
  // if no name then return empty object
  if (!config.name) return {};
  // cast the name to a string...just to make sure.
  config.name = require('../utils/slugify')(config.name);
  // slugify project
  config.project = require('../utils/docker-composify')(config.name);

  return _.merge({}, config, {
    configFiles: files,
    metaCache: `${config.name}.meta.cache`,
    root: path.dirname(files[0]),
    composeCache: path.join(userConfRoot, 'cache', `${config.name}.compose.cache`),
    recipeCache: path.join(userConfRoot, 'cache', `${config.name}.recipe.cache`),
    toolingRouter: path.join(userConfRoot, 'cache', `${config.name}.tooling.router`),
  });
};
