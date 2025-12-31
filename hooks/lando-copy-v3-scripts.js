'use strict';

const fs = require('fs');
const path = require('path');

module.exports = async lando => {
  return lando.Promise.map(lando.config.plugins, plugin => {
    if (fs.existsSync(plugin.scripts)) {
      const confDir = path.join(lando.config.userConfRoot, 'scripts');
      require('../utils/move-config')(plugin.scripts, confDir);
      lando.log.debug('automoved scripts from %s to %s and set to mode 755', plugin.scripts, confDir);
    }
  });
};
