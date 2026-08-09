'use strict';

const fs = require('fs');
const path = require('path');

const exists = require('../utils/exists-sync');

module.exports = async lando => {
  return lando.Promise.map(lando.config.plugins, plugin => {
    // @NOTE: plugin.scripts is undefined for plugins that do not ship scripts
    if (exists(plugin.scripts)) {
      const confDir = path.join(lando.config.userConfRoot, 'scripts');
      const dest = require('../utils/move-config')(plugin.scripts, confDir);
      require('../utils/make-executable')(fs.readdirSync(dest), dest);
      lando.log.debug('automoved scripts from %s to %s and set to mode 755', plugin.scripts, confDir);
    }
  });
};
