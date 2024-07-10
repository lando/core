'use strict';

const path = require('path');

module.exports = async service => {
  service.addHookFile(path.join(__dirname, 'install-git.sh'), {hook: 'boot'});
  service.addHookFile(`
    # temp stuff for demo purposes
    if command -v git > /dev/null 2>&1; then
      git config --global --add safe.directory ${service.appMount}
    fi
  `, {stage: 'app', hook: 'internal-root', id: 'git-safe'});
};
