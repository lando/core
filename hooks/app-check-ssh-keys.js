'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = async (app, lando) => {
  // Get keys on host
  const sshDir = path.resolve(lando.config.home, '.ssh');
  const keys = _(fs.readdirSync(sshDir))
    .filter(file => !_.includes(['config', 'known_hosts'], file))
    .filter(file => path.extname(file) !== '.pub')
    .value();

  // Determine the key size
  const keySize = _.size(_.get(app, 'config.keys', keys));
  app.log.verbose('analyzing user ssh keys... using %s of %s', keySize, _.size(keys));
  app.log.debug('key config... ', _.get(app, 'config.keys', 'none'));
  app.log.silly('users keys', keys);
  // Add a warning if we have more keys than the warning level
  if (keySize > lando.config.maxKeyWarning) {
    app.addMessage(require('../messages/max-key-tip'));
  }
};
