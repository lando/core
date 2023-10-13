'use strict';

const _ = require('lodash');
const warnings = require('../lib/warnings');

module.exports = async (app, lando) => {
  _.forEach(_(lando.versions).filter(version => version && version.dockerVersion).value(), thing => {
    if (!thing.satisfied) app.addWarning(warnings.unsupportedVersionWarning(thing));
  });
};
