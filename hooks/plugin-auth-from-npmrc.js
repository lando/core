'use strict';

const write = require('../utils/write-file');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {parse} = require('ini');

module.exports = async lando => {
  if (!lando.config.loadNpmrcForPluginAuth) {
    return;
  }

  const npmrcPath = path.resolve(os.homedir(), '.npmrc');
  if (!fs.existsSync(npmrcPath)) {
    return;
  }
  lando.log.debug('Reading home .npmrc for plugin-auth.json...');
  const content = fs.readFileSync(npmrcPath, {
    encoding: 'utf-8',
  });
  const data = parse(content);
  write(lando.config.pluginConfigFile, data);
  lando.plugins.updates = data;
};
