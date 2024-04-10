'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  _.forEach(_(lando.versions).filter(version => version && version.dockerVersion).value(), thing => {
    // handle generic unsupported or untested notices
    if (!thing.satisfied) app.addMessage(require('../messages/unsupported-version-warning')(thing));
    if (thing.untested) app.addMessage(require('../messages/untested-version-notice')(thing));

    // handle docker compose recommend update
    if (thing.name === 'compose' && thing.rupdate) {
      app.addMessage(require('../messages/update-docker-compose-warning')(thing));
    }
    // handle docker desktop recommend update
    if (thing.name === 'desktop' && thing.rupdate) {
      thing.os = process.platform === 'darwin' ? 'mac' : 'windows';
      app.addMessage(require('../messages/update-docker-desktop-warning')(thing));
    }
  });
};
