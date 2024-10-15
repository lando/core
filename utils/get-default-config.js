'use strict';

const os = require('os');
const path = require('path');

module.exports = ({
  envPrefix = 'LANDO',
  runtime = 3,
  userConfRoot = path.join(os.homedir(), '.lando'),
  srcRoot = path.resolve(__dirname, '..'),
} = {}) => ({
  configSources: [path.join(srcRoot, 'config.yml'), path.join(userConfRoot, 'config.yml')],
  envPrefix,
  landoFile: '.lando.yml',
  preLandoFiles: ['.lando.base.yml', '.lando.dist.yml', '.lando.recipe.yml', '.lando.upstream.yml'],
  postLandoFiles: ['.lando.local.yml', '.lando.user.yml'],
  runtime,
  srcRoot,
  userConfRoot,
});
