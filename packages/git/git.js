'use strict';

const path = require('path');

module.exports = async service => {
  service.addHookFile(path.join(__dirname, 'install-git.sh'), {hook: 'boot'});
  service.addHookFile(`
    if command -v git > /dev/null 2>&1; then
      git config --system --add safe.directory ${service.appMount}
    fi
  `, {hook: 'tooling', priority: 0});
};
